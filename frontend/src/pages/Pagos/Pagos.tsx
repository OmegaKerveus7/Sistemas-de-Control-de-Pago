import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { rutaInicialPorRol } from '../../components/Menu';
import { pagosService, type Pago, type PrecioInfo, type ResultadoConfirmar, type ConsultaPlaca } from '../../services/pagos.service';
import { parqueoService, type Parqueo } from '../../services/parqueo.service';
import { FormularioRecurrente } from '../PagarParqueo/FormularioRecurrente';
import '../PagarParqueo/PagarParqueo.css';
import './Pagos.css';

function IconoPago({ tipo }: { tipo: 'volver' | 'efectivo' | 'tarjeta' | 'ticket' }) {
  const trazos = {
    volver: 'M19 12H5 M12 19l-7-7 7-7',
    efectivo: 'M2 5h20v14H2Z M6 5a4 4 0 0 1-4 4 M22 9a4 4 0 0 1-4-4 M2 15a4 4 0 0 1 4 4 M18 19a4 4 0 0 1 4-4 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    ticket: 'M5 3h14v18l-3-2-4 2-4-2-3 2Z M8 7h8 M8 11h8 M8 15h4',
    tarjeta: 'M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1 M2 9h20 M6 15h4',
  };
  return <svg className="pagos-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={trazos[tipo]} /></svg>;
}

const REGEX_PLACA = /^[PM]\d{3}[A-Z]{3}$/;
type ConsultaTicket = { parqueo: Parqueo; precio: PrecioInfo | null; permiso: ConsultaPlaca };
type CheckoutTarjeta = { url_pago: string; referencia: string; modo: 'mock' | 'sandbox' | 'live' };

export function Pagos() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeVerListado = usuario?.rol === 'administrador';
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(puedeVerListado);
  const [error, setError] = useState<string | null>(null);
  const [placa, setPlaca] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [consulta, setConsulta] = useState<ConsultaTicket | null>(null);
  const [consumidorFinal, setConsumidorFinal] = useState(true);
  const [nit, setNit] = useState('');
  const [nombreRecibo, setNombreRecibo] = useState('');
  const [metodo, setMetodo] = useState<'efectivo' | 'tarjeta' | null>(null);
  const [errorConsulta, setErrorConsulta] = useState('');
  const [exito, setExito] = useState('');
  const [checkout, setCheckout] = useState<CheckoutTarjeta | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const botonPagar = useRef<HTMLButtonElement>(null);
  const ocupado = useRef(false);
  const pagado = consulta?.parqueo.estado_pago === 'completado';
  const efectivoBloqueado = !!consulta?.parqueo.estado_pago && !pagado;

  function regresar() {
    if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1);
    else navigate(rutaInicialPorRol(usuario?.rol));
  }

  const cargar = useCallback(async () => {
    if (!puedeVerListado) return;
    setCargando(true);
    try { setPagos(await pagosService.listar()); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo actualizar el historial.'); }
    finally { setCargando(false); }
  }, [puedeVerListado]);
  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    const dialog = dialogo.current;
    if (!modalAbierto || !dialog) return;
    dialog.showModal();
    const volverAlBoton = botonPagar.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflowAnterior; volverAlBoton?.focus(); };
  }, [modalAbierto]);

  const recibirResultado = useCallback((pago: ResultadoConfirmar) => {
    if (pago.aprobado) {
      setConsulta(actual => actual ? { ...actual, parqueo: { ...actual.parqueo, estado_pago: 'completado', costo: Number(pago.monto) } } : null);
      setExito(`Ticket cancelado · Pago confirmado${pago.modo !== 'live' ? ' en modo de prueba, sin dinero real' : ''}.`);
      setModalAbierto(false); setCheckout(null); setErrorConsulta('');
      void cargar();
    } else if (pago.estado === 'reembolsado') {
      setErrorConsulta('El pago está reembolsado. Consulta con la administración.');
      setModalAbierto(false); setCheckout(null);
    }
  }, [cargar]);

  useEffect(() => {
    if (!checkout) return;
    let vigente = true;
    let revisando = false;
    async function revisar() {
      if (revisando) return;
      revisando = true;
      try {
        const pago = await pagosService.confirmarPublico(checkout!.referencia);
        if (vigente) recibirResultado(pago);
      } catch { /* El modal conserva la consulta manual del mismo pago. */ }
      finally { revisando = false; }
    }
    const timer = window.setInterval(() => { void revisar(); }, 5000);
    return () => { vigente = false; window.clearInterval(timer); };
  }, [checkout, recibirResultado]);

  async function consultarPlaca(evento: FormEvent) {
    evento.preventDefault();
    if (ocupado.current) return;
    const limpia = placa.trim().toUpperCase();
    if (!REGEX_PLACA.test(limpia)) { setErrorConsulta('Ingresa una placa válida, por ejemplo P123ABC o M123ABC.'); return; }
    ocupado.current = true;
    setConsultando(true); setConsulta(null); setMetodo(null); setCheckout(null); setErrorConsulta(''); setExito('');
    try {
      const permiso = await pagosService.permisoDePlaca(limpia);
      const parqueo: Parqueo = { id: 0, placa: limpia, id_lugar: 0, lugar: permiso.dentro ? 'Dentro del parqueo' : 'Sin ingreso registrado', zona: 'Pago vigente por día', id_ticket: null, ticket: null, fecha_entrada: null, fecha_salida: null, fecha_ocupacion: '', fecha_liberacion: null, estado: 'activo', estado_lugar: '', costo: permiso.pago?.monto ?? null, estado_pago: permiso.estado_pago };
      if (permiso.dentro) {
        const activo = await parqueoService.obtenerActivoPorPlaca(limpia);
        Object.assign(parqueo, activo, { estado_pago: permiso.estado_pago, costo: permiso.pago?.monto ?? activo.costo });
      }
      const precio: PrecioInfo = { efectivo: permiso.tarifa_efectivo, online: permiso.tarifa_online, modo: 'live' };
      setConsulta({ parqueo, precio: permiso.pagado_hoy ? null : precio, permiso });
      setMetodo(null);
      if (permiso.pagado_hoy) setExito('Ticket cancelado · Esta placa ya tiene un pago vigente para hoy.');

    } catch (err) { setErrorConsulta(err instanceof Error ? err.message : 'No se pudo consultar el ticket.'); }
    finally { ocupado.current = false; setConsultando(false); }
  }

  async function pagar() {
    if (!consulta?.precio || !metodo || pagado || ocupado.current || (metodo === 'efectivo' && efectivoBloqueado)) return;
    ocupado.current = true;
    const nitLimpio = consumidorFinal ? 'CF' : nit.toUpperCase().replace(/[\s-]/g, '');
    if (!consumidorFinal && (!/^\d{4,12}[\dK]$/.test(nitLimpio) || nombreRecibo.trim().length < 3)) {
      ocupado.current = false;
      setErrorConsulta('Ingresa un NIT válido y el nombre del recibo.'); return;
    }
    setProcesando(true); setErrorConsulta(''); setExito('');
    try {
      if (metodo === 'efectivo') {
        const resultado = await pagosService.registrarEfectivo({ placa: consulta.parqueo.placa!, id_tipo_vehiculo: consulta.permiso.id_tipo, nit: nitLimpio, nombre: consumidorFinal ? '' : nombreRecibo.trim() });
        setConsulta({ ...consulta, parqueo: { ...consulta.parqueo, estado_pago: 'completado', costo: resultado.monto } });
        setExito(`Ticket cancelado · Pago en efectivo registrado por Q${resultado.monto.toFixed(2)}.`);
        await cargar();
      } else {
        setModalAbierto(true);
        const preparado = checkout || await pagosService.crearPublico({ placa: consulta.parqueo.placa!, nit: nitLimpio, nombre: consumidorFinal ? '' : nombreRecibo.trim(), monto_esperado: consulta.precio.online });
        setCheckout(preparado);
        setConsulta(actual => actual ? { ...actual, parqueo: { ...actual.parqueo, estado_pago: 'pendiente' } } : null);
      }
    } catch (err) {
      setModalAbierto(false);
      setErrorConsulta(err instanceof Error ? err.message : 'No se pudo preparar el pago.');
    } finally { ocupado.current = false; setProcesando(false); }
  }

  async function simular() {
    if (!checkout || ocupado.current) return;
    ocupado.current = true; setProcesando(true);
    try { recibirResultado(await pagosService.simularPublico(checkout.referencia, 'completado')); }
    catch (err) { setErrorConsulta(err instanceof Error ? err.message : 'No se pudo registrar la simulación.'); }
    finally { ocupado.current = false; setProcesando(false); }
  }

  const totalCobrado = pagos.filter(p => p.estado === 'completado').reduce((s, p) => s + Number(p.monto), 0);

  return <section className="pagos-page">
    <div className="pagos-encabezado">
      <button type="button" className="pagos-btn-volver" onClick={regresar} aria-label="Regresar a la vista anterior" title="Regresar"><IconoPago tipo="volver" /></button>
      <div><h1 className="pagos-title">Pagos</h1><p className="pagos-subtitle">Consulta una placa, revisa el ticket y elige cómo pagar.</p></div>
    </div>

    <div className="pagos-consulta-grid">
      <section className="card pagos-form-card pagos-consulta-card">
        <h2 className="pagos-form-title">Consultar placa</h2>
        <form className="pagos-form" onSubmit={consultarPlaca}>
          <div className="form-group pagos-placa-group">
            <label className="form-label" htmlFor="pagos-placa">Placa del vehículo</label>
            <input id="pagos-placa" className="form-input pagos-input-placa" placeholder="Ej. P123ABC" value={placa} maxLength={7} autoComplete="off" disabled={consultando || procesando}
              onChange={e => { setPlaca(e.target.value.toUpperCase()); setConsulta(null); setMetodo(null); setCheckout(null); setErrorConsulta(''); setExito(''); }} />
          </div>
          <button type="submit" className="pagos-btn-link" disabled={consultando || procesando || !REGEX_PLACA.test(placa.trim())}>{consultando ? 'Consultando…' : 'Consultar ticket'}</button>
        </form>
        {errorConsulta && <div className="alerta alerta-error" role="alert">{errorConsulta}</div>}
        {consulta?.precio && !pagado && <>
          <fieldset className="pagos-eleccion">
            <legend>Elige el método de pago</legend>
            <label className={`pagos-opcion pagos-opcion-efectivo${metodo === 'efectivo' ? ' seleccionada' : ''}`}>
              <input type="radio" name="metodo-pago" value="efectivo" checked={metodo === 'efectivo'} disabled={procesando} onChange={() => setMetodo('efectivo')} />
              <IconoPago tipo="efectivo" /><span>Efectivo<strong>Q{consulta.precio.efectivo.toFixed(2)}</strong></span>
            </label>
            <label className={`pagos-opcion pagos-opcion-tarjeta${metodo === 'tarjeta' ? ' seleccionada' : ''}`}>
              <input type="radio" name="metodo-pago" value="tarjeta" checked={metodo === 'tarjeta'} disabled={procesando} onChange={() => setMetodo('tarjeta')} />
              <IconoPago tipo="tarjeta" /><span>Tarjeta<strong>Q{consulta.precio.online.toFixed(2)}</strong></span>
            </label>
          </fieldset>
          {metodo === 'efectivo' && efectivoBloqueado && <p className="pagos-ayuda">El ticket tiene un pago registrado. Continúa con el mismo pago con tarjeta; para cambiarlo a efectivo, consulta con la administración.</p>}
          <div className="pagos-recibo">
            <label><input type="checkbox" checked={consumidorFinal} disabled={procesando || !!checkout} onChange={e => setConsumidorFinal(e.target.checked)} /> Recibo a Consumidor Final (CF)</label>
            {!consumidorFinal && <><label htmlFor="pagos-nit">NIT</label><input id="pagos-nit" className="form-input pagos-input-placa" value={nit} maxLength={14} disabled={procesando || !!checkout} onChange={e => setNit(e.target.value)} /><label htmlFor="pagos-nombre-recibo">Nombre del recibo</label><input id="pagos-nombre-recibo" className="form-input pagos-input-placa" value={nombreRecibo} maxLength={120} disabled={procesando || !!checkout} onChange={e => setNombreRecibo(e.target.value)} /></>}
          </div>
          <button ref={botonPagar} type="button" className={metodo === 'efectivo' ? 'pagos-btn-registrar pagos-pagar-efectivo' : 'pagos-btn-link'} disabled={procesando || !metodo || (metodo === 'efectivo' && efectivoBloqueado)} onClick={() => void pagar()}>
            <IconoPago tipo={metodo || 'ticket'} />{procesando ? 'Procesando…' : !metodo ? 'Selecciona un método de pago' : metodo === 'efectivo' ? 'Registrar pago en efectivo' : checkout ? 'Continuar pago con tarjeta' : 'Pagar con tarjeta'}
          </button>
        </>}
      </section>

      <aside className={`card pagos-form-card pagos-estado-card${pagado ? ' pagos-estado-pagado' : consulta ? ' pagos-estado-pendiente' : ''}`} aria-live="polite" aria-busy={consultando}>
        <h2 className="pagos-form-title"><IconoPago tipo="ticket" /> Estado del ticket</h2>
        {consultando ? <p>Consultando la placa…</p> : !consulta ? <p className="pagos-ayuda">Ingresa una placa para ver aquí su ticket y el estado del pago.</p> : <>
          <strong className="pagos-estado-titulo pagos-ticket-badge">{pagado ? 'Ticket cancelado' : 'Pendiente de pago'}</strong>
          <dl className="pagos-ticket-datos">
            <div><dt>Placa</dt><dd>{consulta.parqueo.placa}</dd></div>
            <div><dt>Ticket</dt><dd>{consulta.parqueo.ticket || '—'}</dd></div>
            <div><dt>Espacio</dt><dd>{consulta.parqueo.lugar} · {consulta.parqueo.zona}</dd></div>
            <div><dt>Entrada</dt><dd>{consulta.parqueo.fecha_entrada ? new Date(consulta.parqueo.fecha_entrada).toLocaleString('es-GT') : '—'}</dd></div>
            <div className="pagos-ticket-total"><dt>{pagado ? 'Pagado' : metodo ? `Monto · ${metodo === 'efectivo' ? 'Efectivo' : 'Tarjeta'}` : 'Método de pago'}</dt><dd className={pagado || metodo ? 'pagos-ticket-monto' : 'pagos-ticket-instruccion'}>{!pagado && !metodo ? 'Selecciona efectivo o tarjeta' : pagado && consulta.parqueo.costo == null ? '—' : `Q${Number(pagado ? consulta.parqueo.costo : metodo === 'efectivo' ? consulta.precio?.efectivo : consulta.precio?.online).toFixed(2)}`}</dd></div>
          </dl>
          {exito && <div className="pagos-exito" role="status">{exito}</div>}
          {!pagado && metodo === 'tarjeta' && checkout && checkout.modo !== 'live' && <p className="pagos-ayuda">Modo de prueba · Sin cobros reales.</p>}
        </>}
      </aside>
    </div>

    {error && <div className="alerta alerta-error" role="alert">{error}</div>}
    {puedeVerListado && <p className="pagos-subtitle">{pagos.length} pagos registrados · Q{totalCobrado.toFixed(2)} cobrados</p>}
      {puedeVerListado && (
      <div className="card pagos-card">
        <div className="pagos-lista-header">
          <h2>Historial de pagos</h2>
          {!cargando && <span>{pagos.length} {pagos.length === 1 ? 'pago registrado' : 'pagos registrados'}</span>}
        </div>
        {cargando ? (
          <div className="pagos-estado"><span className="spinner" /> Cargando pagos...</div>
        ) : pagos.length === 0 ? (
          <div className="pagos-estado">No hay pagos registrados todavía.</div>
        ) : (
          <div className="pagos-tabla-wrapper">
            <table className="pagos-tabla">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Placa</th>
                  <th>Pagador</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.ticket}</td>
                    <td className="pagos-placa">{p.placa}</td>
                    <td>{p.pagador_nombres} {p.pagador_apellidos}</td>
                    <td className="pagos-metodo">{p.metodo}</td>
                    <td>Q{Number(p.monto).toFixed(2)}</td>
                    <td>
                      <span className={`pagos-estado-texto ${p.estado}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td>{new Date(p.fecha_pago).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

    {modalAbierto && <dialog ref={dialogo} className="pagos-modal-tarjeta" aria-labelledby="pagos-modal-titulo" onCancel={() => setModalAbierto(false)} onClose={() => setModalAbierto(false)}>
      <header className="pagos-modal-header"><div><h2 id="pagos-modal-titulo"><IconoPago tipo="tarjeta" /> Pago con tarjeta</h2><p>{consulta?.parqueo.placa} · Q{consulta?.precio?.online.toFixed(2)}</p></div><button type="button" className="pagos-btn-volver" aria-label="Cerrar formulario y regresar a Pagos" onClick={() => setModalAbierto(false)}>✕</button></header>
      {procesando && !checkout ? <p role="status">Preparando el formulario seguro…</p> : checkout?.modo === 'mock' ? <div className="pagos-simulacion"><p>Simulador local · No se solicita tarjeta ni se cobra dinero real.</p><button type="button" className="pagos-btn-link" disabled={procesando} onClick={() => void simular()}>Simular pago aprobado</button></div> : checkout && <FormularioRecurrente url={checkout.url_pago} referencia={checkout.referencia} sandbox={checkout.modo === 'sandbox'} confirmar={pagosService.confirmarPublico} onResultado={recibirResultado} />}
      {errorConsulta && <p className="alerta alerta-error" role="alert">{errorConsulta}</p>}
      <p className="pagos-ayuda">Cerrar este formulario no cancela el pago. Puedes continuar con el mismo ticket.</p>
    </dialog>}
  </section>;
}

export default Pagos;
