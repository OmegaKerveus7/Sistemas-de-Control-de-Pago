import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  guardianService,
  type BusquedaGuardian,
  type CriterioGuardian,
  type LugarGuardian,
  type ResumenGuardian,
} from '../../services/guardian.service';
import { CobroPlaca } from '../../components/CobroPlaca';
import { useAuth } from '../../hooks/useAuth';
import './Guardian.css';

type EstadoMensaje = 'exito' | 'error' | 'bloqueo';

interface Mensaje {
  tipo: EstadoMensaje;
  texto: string;
}

const IconoActualizar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

function numero(valor: number | string | undefined): number {
  return Number(valor ?? 0);
}

function esPagoCompletado(vehiculo: BusquedaGuardian | null): boolean {
  return !!vehiculo && (vehiculo.autorizado === true || Number(vehiculo.pago_completado) === 1);
}

const REGEX_PLACA = /^([PM])\d{3}[A-Z]{3}$/;

function detectarTipoVehiculo(placa: string): 'carro' | 'moto' | null {
  const coincidencia = REGEX_PLACA.exec(placa.trim().toUpperCase());
  if (!coincidencia) return null;
  return coincidencia[1] === 'P' ? 'carro' : 'moto';
}

function lugarCompatibleConTipo(lugar: LugarGuardian, tipo: 'carro' | 'moto' | null): boolean {
  if (!tipo || !lugar.tipo_permitido) return true;
  const permitido = lugar.tipo_permitido.toLowerCase();
  return tipo === 'moto' ? permitido.includes('moto') : !permitido.includes('moto');
}

export function Guardian() {
  const { usuario } = useAuth();
  const [operacion, setOperacion] = useState<'entrada' | 'salida'>('entrada');
  const [ubicacionManual, setUbicacionManual] = useState(false);
  const [resumen, setResumen] = useState<ResumenGuardian | null>(null);
  const [lugares, setLugares] = useState<LugarGuardian[]>([]);
  const [cargandoMapa, setCargandoMapa] = useState(true);
  const [placaEntrada, setPlacaEntrada] = useState('');
  const [zonaEntrada, setZonaEntrada] = useState('');
  const [lugarEntrada, setLugarEntrada] = useState('');
  const [registrandoEntrada, setRegistrandoEntrada] = useState(false);
  const [valorBusqueda, setValorBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [registrandoSalida, setRegistrandoSalida] = useState(false);
  const [vehiculo, setVehiculo] = useState<BusquedaGuardian | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const tipoDetectado = useMemo(() => detectarTipoVehiculo(placaEntrada), [placaEntrada]);
  const ocupadosAnteriores = numero(resumen?.ocupados_anteriores);
  const ocupadosAnterioresPorZona = useMemo(() => {
    const agrupados = new Map<string, string[]>();
    for (const ocupacion of resumen?.ocupados_anteriores_detalle ?? []) {
      const lugaresZona = agrupados.get(ocupacion.zona) ?? [];
      lugaresZona.push(ocupacion.lugar);
      agrupados.set(ocupacion.zona, lugaresZona);
    }
    return [...agrupados.entries()];
  }, [resumen]);
  const zonasEntrada = useMemo(() => {
    const zonas = new Map<number, string>();
    for (const lugar of lugares) zonas.set(Number(lugar.zona_id), lugar.zona);
    return [...zonas.entries()];
  }, [lugares]);
  const lugaresEntradaDisponibles = useMemo(() => {
    if (!zonaEntrada) return [];
    return lugares.filter((lugar) =>
      String(lugar.zona_id) === zonaEntrada
      && lugar.estado === 'disponible'
      && lugarCompatibleConTipo(lugar, tipoDetectado),
    );
  }, [lugares, zonaEntrada, tipoDetectado]);

  useEffect(() => {
    if (lugarEntrada && !lugaresEntradaDisponibles.some((lugar) => String(lugar.id) === lugarEntrada)) {
      setLugarEntrada('');
    }
  }, [lugarEntrada, lugaresEntradaDisponibles]);

  const cargarEstado = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargandoMapa(true);
    try {
      const [nuevoResumen, nuevosLugares] = await Promise.all([
        guardianService.resumen(),
        guardianService.lugares(),
      ]);
      setResumen(nuevoResumen);
      setLugares(nuevosLugares);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo actualizar la ocupación.' });
    } finally {
      if (!silencioso) setCargandoMapa(false);
    }
  }, []);

  useEffect(() => {
    void cargarEstado();
    const intervalo = window.setInterval(() => void cargarEstado(true), 15_000);
    return () => window.clearInterval(intervalo);
  }, [cargarEstado]);

  const consultarVehiculo = async (nuevoCriterio: CriterioGuardian) => {
    setBuscando(true);
    setMensaje(null);
    setVehiculo(null);
    try {
      const encontrado = await guardianService.buscar(nuevoCriterio);
      setVehiculo(encontrado);
      setMensaje({
        tipo: esPagoCompletado(encontrado) ? 'exito' : 'bloqueo',
        texto: esPagoCompletado(encontrado)
          ? 'Pago confirmado. Revisa la placa y pulsa «Confirmar salida».'
          : 'Falta confirmar el pago. El conductor puede pagar en línea o en efectivo contigo.',
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo buscar el vehículo.' });
    } finally {
      setBuscando(false);
    }
  };

  const lugaresPorZona = useMemo(() => {
    const agrupados = new Map<string, LugarGuardian[]>();
    for (const lugar of lugares) {
      const actuales = agrupados.get(lugar.zona) ?? [];
      actuales.push(lugar);
      agrupados.set(lugar.zona, actuales);
    }
    return [...agrupados.entries()];
  }, [lugares]);

  const registrarEntrada = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const placa = placaEntrada.trim().toUpperCase();
    if (!placa) {
      setMensaje({ tipo: 'error', texto: 'Ingresa la placa para registrar la entrada.' });
      return;
    }
    if (!detectarTipoVehiculo(placa)) {
      setMensaje({
        tipo: 'error',
        texto: 'La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras. Ej: P123ABC o M123ABC',
      });
      return;
    }

    setRegistrandoEntrada(true);
    setMensaje(null);
    try {
      const resultado = await guardianService.entrada({
        placa,
        ...(ubicacionManual && zonaEntrada ? { zona_id: Number(zonaEntrada) } : {}),
        ...(ubicacionManual && lugarEntrada ? { lugar_id: Number(lugarEntrada) } : {}),
      });
      setPlacaEntrada('');
      setZonaEntrada('');
      setLugarEntrada('');
      setMensaje({
        tipo: 'exito',
        texto: `Entrada registrada: ${resultado.placa} asignado a ${resultado.lugar.numero} (${resultado.lugar.zona}). Ticket ${resultado.ticket}.${resultado.pago_vigente ? ' Pago del día verificado.' : ' Entró sin pago vigente: la salida seguirá bloqueada.'}${resultado.es_externo ? ' Vehículo registrado como visitante.' : ''}`,
      });
      await cargarEstado(true);
    } catch (error) {
      setMensaje({ tipo: 'bloqueo', texto: error instanceof Error ? error.message : 'No fue posible registrar la entrada.' });
    } finally {
      setRegistrandoEntrada(false);
    }
  };

  const buscarVehiculo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valor = valorBusqueda.trim();
    if (!REGEX_PLACA.test(valor.toUpperCase())) {
      setMensaje({ tipo: 'error', texto: 'Ingresa una placa válida: P123ABC o M123ABC.' });
      return;
    }
    await consultarVehiculo({ placa: valor.toUpperCase() });
  };

  const confirmarSalida = async () => {
    if (!vehiculo || !esPagoCompletado(vehiculo)) return;
    setRegistrandoSalida(true);
    setMensaje(null);
    try {
      const salida = await guardianService.salida({ ticket: vehiculo.numero_ticket });
      setMensaje({ tipo: 'exito', texto: `${salida.mensaje}: ${salida.placa} salió de ${salida.lugar}.` });
      setVehiculo(null);
      setValorBusqueda('');
      await cargarEstado(true);
    } catch (error) {
      setMensaje({ tipo: 'bloqueo', texto: error instanceof Error ? error.message : 'No se pudo registrar la salida.' });
    } finally {
      setRegistrandoSalida(false);
    }
  };

  return (
    <section className={`guardian-page guardian-mode-${operacion}`}>
      {usuario?.rol !== 'guardia' && <Link to="/app/dashboard" className="guardian-back">← Volver al panel de control</Link>}
      <div className="guardian-heading">
        <div>
          <p className="guardian-eyebrow">Control de acceso</p>
          <h1>Entradas y salidas</h1>
          <p>Elige la operación y sigue los pasos para atender al conductor.</p>
        </div>
        <button type="button" className="guardian-refresh" onClick={() => void cargarEstado()} disabled={cargandoMapa}>
          {cargandoMapa ? 'Actualizando...' : <><IconoActualizar /> Actualizar</>}
        </button>
      </div>

      {mensaje && (
        <div className={`guardian-alert guardian-alert-${mensaje.tipo}`} role="status">
          {mensaje.texto}
        </div>
      )}

      {ocupadosAnteriores > 0 && (
        <details className="guardian-carryover-alert">
          <summary>{ocupadosAnteriores} espacios ocupados desde días anteriores · Ver detalle</summary>
          <div>
            <strong>
              {ocupadosAnteriores === 1
                ? 'Hay 1 espacio que todavía no ha sido desocupado.'
                : `Hay ${ocupadosAnteriores} espacios que todavía no han sido desocupados.`}
            </strong>
            <p>Corresponden a vehículos que ingresaron antes del día de hoy.</p>
            <ul className="guardian-carryover-places">
              {ocupadosAnterioresPorZona.map(([zona, lugaresZona]) => (
                <li key={zona}>
                  <span>{zona}:</span> <strong>{lugaresZona.join(', ')}</strong>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      <div className="guardian-summary" aria-live="polite">
        <article className="guardian-stat guardian-stat-total"><span>Capacidad total</span><strong>{numero(resumen?.total)}</strong></article>
        <article className="guardian-stat guardian-stat-free"><span>Espacios libres</span><strong>{numero(resumen?.disponibles)}</strong></article>
        <article className="guardian-stat guardian-stat-busy"><span>Espacios ocupados</span><strong>{numero(resumen?.ocupados)}</strong></article>
      </div>

      <div className="guardian-operation-picker" role="group" aria-label="Operación del guardia">
        <button type="button" aria-pressed={operacion === 'entrada'} disabled={registrandoEntrada || registrandoSalida} onClick={() => { setOperacion('entrada'); setMensaje(null); }}><strong>→ Registrar entrada</strong><span>Registrar placa y asignar espacio</span></button>
        <button type="button" aria-pressed={operacion === 'salida'} disabled={registrandoEntrada || registrandoSalida} onClick={() => { setOperacion('salida'); setMensaje(null); }}><strong>← Cobrar / registrar salida</strong><span>Verificar o cobrar y registrar salida</span></button>
      </div>
      <div className="guardian-workspace guardian-workspace-focused">
        <article className="guardian-card guardian-entry-card" hidden={operacion !== 'entrada'}>
          <div className="guardian-card-title"><div><h2>¿Qué vehículo va a ingresar?</h2><p>Solo necesitas la placa. La ubicación se asigna automáticamente.</p></div></div>
          <aside className="guardian-steps" aria-label="Pasos para registrar una entrada"><h3>Así registras la entrada</h3><ol><li><strong>Escribe la placa</strong><span>El tipo de vehículo se detecta automáticamente.</span></li><li><strong>Confirma la entrada</strong><span>Se genera el ticket y se ocupa un espacio disponible.</span></li><li><strong>Indica dónde estacionarse</strong><span>La confirmación muestra el parqueo y el número de espacio.</span></li></ol></aside>
          <form onSubmit={registrarEntrada} className="guardian-form">
            <label htmlFor="placa-entrada">Placa del vehículo</label>
            <input
              id="placa-entrada"
              value={placaEntrada}
              onChange={(event) => setPlacaEntrada(event.target.value.toUpperCase())}
              placeholder="Ej. P123ABC"
              maxLength={7}
              disabled={registrandoEntrada}
              autoComplete="off"
            />
            {placaEntrada && (
              tipoDetectado ? (
                <p className="guardian-tipo-detectado">
                  Tipo detectado: <strong>{tipoDetectado === 'carro' ? 'Carro' : 'Moto'}</strong>
                </p>
              ) : (
                <p className="guardian-tipo-detectado guardian-tipo-detectado-error">
                  La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras.
                </p>
              )
            )}
            <div className="guardian-auto-location"><strong>Asignación automática</strong><p>El sistema elige un espacio libre compatible con el vehículo.</p></div>
            <label className="guardian-manual-toggle"><input type="checkbox" checked={ubicacionManual} onChange={(e) => { setUbicacionManual(e.target.checked); setZonaEntrada(''); setLugarEntrada(''); }} disabled={registrandoEntrada} /> Elegir parqueo o espacio específico</label>
            {ubicacionManual && <div className="guardian-location-fields">
            <label htmlFor="zona-entrada">Parqueo</label>
            <select
              id="zona-entrada"
              value={zonaEntrada}
              onChange={(event) => {
                setZonaEntrada(event.target.value);
                setLugarEntrada('');
              }}
              disabled={registrandoEntrada}
            >
              <option value="">Asignar en cualquier parqueo</option>
              {zonasEntrada.map(([id, zona]) => <option key={id} value={id}>{zona}</option>)}
            </select>
            <label htmlFor="lugar-entrada">Espacio</label>
            <select
              id="lugar-entrada"
              value={lugarEntrada}
              onChange={(event) => setLugarEntrada(event.target.value)}
              disabled={registrandoEntrada || !zonaEntrada}
            >
              <option value="">
                {zonaEntrada ? 'Asignar un espacio disponible' : 'Selecciona primero un parqueo'}
              </option>
              {lugaresEntradaDisponibles.map((lugar) => (
                <option key={lugar.id} value={lugar.id}>{lugar.lugar}</option>
              ))}
            </select>
            {zonaEntrada && lugaresEntradaDisponibles.length === 0 && (
              <p className="guardian-location-empty">No hay espacios disponibles compatibles en este parqueo.</p>
            )}
            </div>}
            <button
              className="guardian-button guardian-button-primary"
              disabled={registrandoEntrada || !tipoDetectado || (ubicacionManual && !!zonaEntrada && lugaresEntradaDisponibles.length === 0)}
            >
              {registrandoEntrada ? 'Registrando...' : ubicacionManual && lugarEntrada ? 'Confirmar entrada en el espacio seleccionado' : 'Confirmar entrada y asignar espacio'}
            </button>
          </form>
          <p className="guardian-hint">No se requiere pago para ingresar. El conductor puede pagar con tarjeta durante su estancia o en efectivo contigo antes de salir.</p>
        </article>

        <article className="guardian-card guardian-exit-card" hidden={operacion !== 'salida'}>
          <div className="guardian-card-title"><div><h2>¿Qué vehículo va a salir?</h2><p>Busca su placa para verificar el pago o registrar el cobro en efectivo.</p></div></div>
          <aside className="guardian-steps" aria-label="Pasos para registrar una salida"><h3>Así atiendes la salida</h3><ol><li><strong>Busca la placa</strong><span>Comprueba que coincida con el vehículo que tienes enfrente.</span></li><li><strong>Revisa el pago</strong><span>Si falta pagar, registra el efectivo o verifica el pago en línea.</span></li><li><strong>Confirma la salida</strong><span>El espacio se libera al completar esta acción.</span></li></ol></aside>
          <label className="guardian-search-label" htmlFor="guardian-busqueda">Placa del vehículo</label>
          <form onSubmit={buscarVehiculo} className="guardian-search-row guardian-search-placa">
            <input
              id="guardian-busqueda"
              value={valorBusqueda}
              onChange={(event) => { setValorBusqueda(event.target.value.toUpperCase()); setVehiculo(null); setMensaje(null); }}
              placeholder="Ej. P123ABC"
              maxLength={7}
              disabled={buscando}
              autoComplete="off"
            />
            <button className="guardian-button guardian-button-secondary" disabled={buscando}>{buscando ? 'Buscando...' : 'Buscar'}</button>
          </form>
          <p className="guardian-hint">Busca la placa para consultar si ya pagó. Si falta el pago, podrás registrar el efectivo antes de confirmar la salida.</p>

          {vehiculo && (
            <div className="guardian-vehicle-result">
              <div className="guardian-vehicle-main"><strong>{vehiculo.placa}</strong><span>{vehiculo.tipo_vehiculo ?? 'Tipo no disponible'} · {vehiculo.zona}, lugar {vehiculo.lugar}</span><small>Ticket: {vehiculo.numero_ticket}</small></div>
              <span className={`guardian-payment ${esPagoCompletado(vehiculo) ? 'is-paid' : 'is-pending'}`}>
                {esPagoCompletado(vehiculo) ? 'Pago completado' : (vehiculo.pago_estado ?? 'Sin pago')}
              </span>
              {!esPagoCompletado(vehiculo) && <div className="guardian-exit-payment">
                <h3>Pago pendiente: elige cómo continuar</h3>
                <p>Si paga con tarjeta desde la plataforma, pulsa «Verificar pago» cuando termine. Si entrega efectivo, registra el cobro aquí.</p>
                <CobroPlaca key={vehiculo.placa} placa={vehiculo.placa} onCobrado={() => void consultarVehiculo({ ticket: vehiculo.numero_ticket })} />
                <button type="button" className="guardian-refresh" disabled={buscando} onClick={() => void consultarVehiculo({ ticket: vehiculo.numero_ticket })}>{buscando ? 'Verificando…' : 'Verificar pago'}</button>
              </div>}
              <div className="guardian-result-actions">
                <button
                  type="button"
                  className="guardian-button guardian-button-danger"
                  onClick={() => void confirmarSalida()}
                  disabled={!esPagoCompletado(vehiculo) || registrandoSalida}
                  title={!esPagoCompletado(vehiculo) ? 'La salida requiere un pago completado' : 'Confirmar salida y liberar lugar'}
                >
                  {registrandoSalida ? 'Registrando salida...' : 'Confirmar salida y liberar espacio'}
                </button>
              </div>
            </div>
          )}
        </article>
      </div>

      <section className="guardian-card guardian-map-card">
        <div className="guardian-map-title"><div><h2>Ocupación por zona</h2><p>Se actualiza automáticamente cada 15 segundos.</p></div><span className="guardian-live"><i /> En tiempo real</span></div>
        {cargandoMapa ? <div className="guardian-loading">Cargando lugares...</div> : lugaresPorZona.length === 0 ? (
          <div className="guardian-empty"><strong>Aún no hay lugares configurados.</strong><span>Cuando Administración registre lugares reales, aparecerán agrupados por zona aquí.</span></div>
        ) : (
          <div className="guardian-zones">
            {lugaresPorZona.map(([zona, lugaresZona]) => (
              <article className="guardian-zone" key={zona}>
                <header><h3>{zona}</h3><span>{lugaresZona.filter((lugar) => lugar.estado === 'disponible').length} libres</span></header>
                <div className="guardian-spaces">
                  {lugaresZona.map((lugar) => (
                    <div className={`guardian-space guardian-space-${lugar.estado}`} key={lugar.id} title={lugar.placa ? `${lugar.placa} · ${lugar.ticket ?? ''}` : `Lugar ${lugar.lugar}`}>
                      <strong>{lugar.lugar}</strong><span>{lugar.estado === 'disponible' ? 'Libre' : 'Ocupado'}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
