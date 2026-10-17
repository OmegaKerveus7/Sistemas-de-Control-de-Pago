import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { guardianService, type EstadisticasGuardian, type ResumenGuardian, type TipoIndicador, type DetalleIndicador } from '../../services/guardian.service';
import { PagosHoy } from './PagosHoy';
import './Dashboard.css';

function IconoIndicador({ tipo }: { tipo: 'espacio' | 'vehiculo' | 'entrada' | 'salida' | 'pago' | 'sinpago' | 'actualizar' }) {
  const trazos = {
    espacio: 'M4 3h16v18H4Z M9 17V7h4a3 3 0 0 1 0 6H9',
    vehiculo: 'M5 17H3v-6l3-6h12l3 6v6h-2 M5 11h14 M7 17h10 M5 17v3 M19 17v3 M6 14h2 M16 14h2',
    entrada: 'M14 3h6v18h-6 M3 12h12 M10 7l5 5-5 5',
    salida: 'M10 3H4v18h6 M12 12h9 M16 7l5 5-5 5',
    pago: 'M3 4h18v16H3Z M3 9h18 M7 15h3',
    sinpago: 'M12 3l10 18H2Z M12 9v5 M12 17h.01',
    actualizar: 'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M18 18a8 8 0 0 1-14-6',
  };
  return <svg className="dashboard-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={trazos[tipo]} /></svg>;
}

const NOMBRES_INDICADOR: Record<TipoIndicador, string> = {
  espacios: 'Espacios libres', vehiculos: 'Vehículos dentro', entradas: 'Entradas de hoy',
  salidas: 'Salidas de hoy', pendientes: 'Pagos pendientes', sin_pago: 'Sin pago registrado',
};
const CRITERIOS_INDICADOR: Record<TipoIndicador, string> = {
  espacios: 'Espacios habilitados cuyo estado es disponible.',
  vehiculos: 'Tickets activos, incluyendo vehículos que ingresaron en días anteriores.',
  entradas: 'Tickets con fecha de entrada de hoy, según la fecha del servidor de base de datos.',
  salidas: 'Tickets con fecha de salida de hoy, según la fecha del servidor de base de datos.',
  pendientes: 'Tickets activos que tienen al menos un pago pendiente.',
  sin_pago: 'Tickets activos que no tienen ningún pago registrado.',
};

export function Dashboard() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const [resumen, setResumen] = useState<ResumenGuardian | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGuardian | null>(null);
  const [errorEstadisticas, setErrorEstadisticas] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [indicadorAbierto, setIndicadorAbierto] = useState<TipoIndicador | null>(null);
  const [detalle, setDetalle] = useState<DetalleIndicador | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');
  const [revisionDetalle, setRevisionDetalle] = useState(0);
  const dialogo = useRef<HTMLDialogElement>(null);
  const botonOrigen = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!indicadorAbierto || !dialogo.current) return;
    const dialog = dialogo.current;
    const boton = botonOrigen.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; boton?.focus(); };
  }, [indicadorAbierto]);

  useEffect(() => {
    if (!indicadorAbierto) return;
    let vigente = true;
    setCargandoDetalle(true); setErrorDetalle(''); setDetalle(null);
    guardianService.detalleIndicador(indicadorAbierto)
      .then(datos => {
        if (!vigente) return;
        setDetalle(datos);
        if (indicadorAbierto === 'espacios') setResumen(actual => actual ? { ...actual, disponibles: datos.total } : null);
        else {
          const campo = { vehiculos: 'vehiculos_activos', entradas: 'entradas_hoy', salidas: 'salidas_hoy', pendientes: 'pagos_pendientes', sin_pago: 'sin_pago' }[indicadorAbierto];
          setEstadisticas(actual => actual ? { ...actual, [campo]: datos.total } : null);
        }
      })
      .catch(err => { if (vigente) setErrorDetalle(err instanceof Error ? err.message : 'No se pudo cargar el detalle.'); })
      .finally(() => { if (vigente) setCargandoDetalle(false); });
    return () => { vigente = false; };
  }, [indicadorAbierto, revisionDetalle]);

  function abrirDetalle(tipo: TipoIndicador, boton: HTMLButtonElement) {
    botonOrigen.current = boton;
    setDetalle(null); setErrorDetalle(''); setCargandoDetalle(true); setIndicadorAbierto(tipo);
  }
  function fechaDetalle(fecha?: string | null) {
    return fecha ? new Date(fecha).toLocaleString('es-GT', { timeZone: 'America/Guatemala' }) : '—';
  }

  const esPersonalParqueo = rol === 'guardia' || rol === 'administrador';

  const cargarResumen = useCallback(async () => {
    if (!esPersonalParqueo) return;
    setCargando(true); setErrorEstadisticas(null);
    try {
      const [nuevoResumen, nuevasEstadisticas] = await Promise.all([guardianService.resumen(), guardianService.estadisticas()]);
      setResumen(nuevoResumen); setEstadisticas(nuevasEstadisticas); setActualizado(new Date());
    } catch (error) { setErrorEstadisticas(error instanceof Error ? error.message : 'No se pudo actualizar el resumen.'); }
    finally { setCargando(false); }
  }, [esPersonalParqueo]);
  useEffect(() => { void cargarResumen(); }, [cargarResumen]);
  const numero = (valor: number | string | undefined) => cargando || valor === undefined ? '—' : Number(valor);

  return <section className="dashboard-page">
    <header className="dashboard-hello">
      <h1 className="dashboard-title">Resumen de hoy</h1>
    </header>

    {esPersonalParqueo && <div className="dashboard-daybar"><strong>{new Date().toLocaleDateString('es-GT', { timeZone: 'America/Guatemala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong><Link className="dashboard-primary-action" to="/app/guardian">Entradas y salidas</Link></div>}
    {esPersonalParqueo && <section className="dashboard-stats" aria-label="Estado actual del parqueo" aria-busy={cargando}>
      <div className="dashboard-stats-heading"><h2>Parqueo</h2>
        <button type="button" className="dashboard-control-link" disabled={cargando} onClick={() => void cargarResumen()}><IconoIndicador tipo="actualizar" />{cargando ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
      {errorEstadisticas && <p className="dashboard-stats-error" role="alert">{errorEstadisticas}</p>}
      <div className="dashboard-stats-grid dashboard-occupancy-grid">
        <button type="button" className="dashboard-stat dashboard-stat-free" onClick={e => abrirDetalle('espacios', e.currentTarget)} disabled={cargando} aria-haspopup="dialog" aria-label="Ver detalle: Espacios libres"><span>Espacios libres</span><strong>{numero(resumen?.disponibles)}</strong><small>de {numero(resumen?.total)}</small></button>
        <button type="button" className="dashboard-stat" onClick={e => abrirDetalle('vehiculos', e.currentTarget)} disabled={cargando} aria-haspopup="dialog" aria-label="Ver detalle: Vehículos dentro"><span>Vehículos dentro</span><strong>{numero(estadisticas?.vehiculos_activos)}</strong></button>
        <button type="button" className="dashboard-stat" onClick={e => abrirDetalle('entradas', e.currentTarget)} disabled={cargando} aria-haspopup="dialog" aria-label="Ver detalle: Entradas de hoy"><span>Entradas hoy</span><strong>{numero(estadisticas?.entradas_hoy)}</strong></button>
      </div>
    </section>}

    {esPersonalParqueo && <PagosHoy revision={actualizado?.getTime() ?? 0} />}
    {indicadorAbierto && <dialog ref={dialogo} className="dashboard-detalle-modal" aria-labelledby="dashboard-detalle-titulo" onCancel={() => setIndicadorAbierto(null)} onClose={() => setIndicadorAbierto(null)}>
      <header className="dashboard-detalle-header"><div><h2 id="dashboard-detalle-titulo">{NOMBRES_INDICADOR[indicadorAbierto]}</h2><p>{CRITERIOS_INDICADOR[indicadorAbierto]}</p></div><button type="button" className="dashboard-control-link" onClick={() => setIndicadorAbierto(null)} aria-label="Cerrar detalle">Cerrar ✕</button></header>
      {cargandoDetalle ? <p role="status">Cargando detalle…</p> : errorDetalle ? <div role="alert"><p className="dashboard-stats-error">{errorDetalle}</p><button type="button" className="dashboard-control-link" onClick={() => setRevisionDetalle(n => n + 1)}>Reintentar</button></div> : detalle && <>
        <p className="dashboard-detalle-total">{detalle.total} {indicadorAbierto === 'espacios' ? 'espacios' : 'tickets'} encontrados · Datos consultados al abrir este detalle.</p>
        {detalle.filas.length === 0 ? <p>No hay registros para este estado.</p> : <div className="dashboard-detalle-tabla-wrapper"><table className="dashboard-detalle-tabla"><thead><tr>
          {indicadorAbierto !== 'espacios' && <><th>Placa</th><th>Ticket</th></>}
          <th>Espacio / zona</th><th>Tipo de vehículo</th>
          {indicadorAbierto !== 'espacios' && <><th>Entrada</th>{indicadorAbierto === 'salidas' && <th>Salida</th>}<th>Pago</th><th>Monto</th></>}
        </tr></thead><tbody>{detalle.filas.map(fila => <tr key={fila.id}>
          {indicadorAbierto !== 'espacios' && <><td><strong>{fila.placa}</strong></td><td>{fila.ticket}</td></>}
          <td>{fila.lugar || '—'}<small>{fila.zona || '—'}</small></td><td>{fila.tipo_vehiculo || '—'}</td>
          {indicadorAbierto !== 'espacios' && <><td>{fechaDetalle(fila.fecha_entrada)}</td>{indicadorAbierto === 'salidas' && <td>{fechaDetalle(fila.fecha_salida)}</td>}<td><span className={`dashboard-pago-estado ${fila.estado_pago}`}>{fila.estado_pago === 'sin_pago' ? 'Sin pago' : fila.estado_pago}</span></td><td>{fila.monto == null ? '—' : `Q${Number(fila.monto).toFixed(2)}`}</td></>}
        </tr>)}</tbody></table></div>}
      </>}
    </dialog>}

  </section>;
}
