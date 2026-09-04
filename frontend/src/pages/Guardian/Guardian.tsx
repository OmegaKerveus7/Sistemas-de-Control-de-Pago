import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  guardianService,
  type BusquedaGuardian,
  type CriterioGuardian,
  type LugarGuardian,
  type ResumenGuardian,
} from '../../services/guardian.service';
import './Guardian.css';

type EstadoMensaje = 'exito' | 'error' | 'bloqueo';
type TipoBusqueda = 'placa' | 'ticket' | 'referencia' | 'qr';

interface Mensaje {
  tipo: EstadoMensaje;
  texto: string;
}

function numero(valor: number | string | undefined): number {
  return Number(valor ?? 0);
}

function esPagoCompletado(vehiculo: BusquedaGuardian | null): boolean {
  return !!vehiculo && (vehiculo.autorizado === true || Number(vehiculo.pago_completado) === 1);
}

function criterio(tipo: TipoBusqueda, valor: string): CriterioGuardian {
  const limpio = valor.trim();
  if (tipo === 'placa') return { placa: limpio.toUpperCase() };
  if (tipo === 'ticket') return { ticket: limpio };
  if (tipo === 'referencia') return { referencia: limpio };
  return { qr: limpio };
}

function etiquetaBusqueda(tipo: TipoBusqueda): string {
  if (tipo === 'placa') return 'una placa';
  if (tipo === 'ticket') return 'un ticket';
  if (tipo === 'referencia') return 'una referencia de pago';
  return 'un código QR';
}

function limiteBusqueda(tipo: TipoBusqueda): number {
  if (tipo === 'placa') return 7;
  if (tipo === 'ticket') return 20;
  if (tipo === 'referencia') return 100;
  return 255;
}

function placeholderBusqueda(tipo: TipoBusqueda): string {
  if (tipo === 'placa') return 'P123ABC';
  if (tipo === 'ticket') return 'TK-...';
  if (tipo === 'referencia') return 'REF-...';
  return 'BELEN-PAGO|v1|REF-...|P123ABC';
}

export function Guardian() {
  const [resumen, setResumen] = useState<ResumenGuardian | null>(null);
  const [lugares, setLugares] = useState<LugarGuardian[]>([]);
  const [cargandoMapa, setCargandoMapa] = useState(true);
  const [placaEntrada, setPlacaEntrada] = useState('');
  const [tipoEntrada, setTipoEntrada] = useState<'moto' | 'carro'>('carro');
  const [registrandoEntrada, setRegistrandoEntrada] = useState(false);
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>('placa');
  const [valorBusqueda, setValorBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [validandoPago, setValidandoPago] = useState(false);
  const [registrandoSalida, setRegistrandoSalida] = useState(false);
  const [vehiculo, setVehiculo] = useState<BusquedaGuardian | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [lectorActivo, setLectorActivo] = useState(false);
  const procesandoQr = useRef(false);

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
          ? 'Pago completado detectado. El guardia puede validarlo y confirmar la salida.'
          : 'El vehículo tiene un pago pendiente, fallido o inexistente. La salida permanece bloqueada.',
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo buscar el vehículo.' });
    } finally {
      setBuscando(false);
    }
  };

  useEffect(() => {
    if (!lectorActivo) return;

    let cancelado = false;
    let scanner: import('html5-qrcode').Html5Qrcode | null = null;

    const iniciarLector = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelado) return;
        scanner = new Html5Qrcode('guardian-qr-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (texto) => {
            if (procesandoQr.current) return;
            procesandoQr.current = true;
            setLectorActivo(false);
            setTipoBusqueda('qr');
            setValorBusqueda(texto);
            void consultarVehiculo({ qr: texto }).finally(() => { procesandoQr.current = false; });
          },
          () => undefined,
        );
      } catch (error) {
        if (!cancelado) {
          setLectorActivo(false);
          setMensaje({ tipo: 'error', texto: error instanceof Error ? `No se pudo abrir la cámara: ${error.message}` : 'No se pudo abrir la cámara.' });
        }
      }
    };

    void iniciarLector();
    return () => {
      cancelado = true;
      if (scanner) void scanner.stop().catch(() => undefined).then(() => scanner?.clear());
    };
  }, [lectorActivo]);

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

    setRegistrandoEntrada(true);
    setMensaje(null);
    try {
      const resultado = await guardianService.entrada(placa, tipoEntrada);
      setPlacaEntrada('');
      setMensaje({
        tipo: 'exito',
        texto: `Entrada registrada: ${resultado.placa} asignado a ${resultado.lugar.numero} (${resultado.lugar.zona}). Ticket ${resultado.ticket}.${resultado.es_externo ? ' Vehículo registrado como visitante.' : ''}`,
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
    if (!valor) {
      setMensaje({ tipo: 'error', texto: `Ingresa ${etiquetaBusqueda(tipoBusqueda)} para consultar.` });
      return;
    }
    await consultarVehiculo(criterio(tipoBusqueda, valor));
  };

  const validarPago = async () => {
    if (!vehiculo) return;
    setValidandoPago(true);
    setMensaje(null);
    try {
      const validado = await guardianService.validarPago({ ticket: vehiculo.numero_ticket });
      setVehiculo(validado);
      setMensaje({
        tipo: validado.autorizado ? 'exito' : 'bloqueo',
        texto: validado.mensaje ?? (validado.autorizado ? 'Pago validado.' : 'Pago no completado.'),
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo validar el pago.' });
    } finally {
      setValidandoPago(false);
    }
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
    <section className="guardian-page">
      <div className="guardian-heading">
        <div>
          <p className="guardian-eyebrow">Control de acceso</p>
          <h1>Vista del guardián</h1>
          <p>Registra accesos, verifica pagos y consulta la ocupación en tiempo real.</p>
        </div>
        <button type="button" className="guardian-refresh" onClick={() => void cargarEstado()} disabled={cargandoMapa}>
          {cargandoMapa ? 'Actualizando...' : '↻ Actualizar'}
        </button>
      </div>

      {mensaje && (
        <div className={`guardian-alert guardian-alert-${mensaje.tipo}`} role="status">
          {mensaje.texto}
        </div>
      )}

      <div className="guardian-summary" aria-live="polite">
        <article className="guardian-stat guardian-stat-total"><span>Total</span><strong>{numero(resumen?.total)}</strong></article>
        <article className="guardian-stat guardian-stat-free"><span>Disponibles</span><strong>{numero(resumen?.disponibles)}</strong></article>
        <article className="guardian-stat guardian-stat-busy"><span>Ocupados</span><strong>{numero(resumen?.ocupados)}</strong></article>
      </div>

      <div className="guardian-workspace">
        <article className="guardian-card guardian-entry-card">
          <div className="guardian-card-title"><span>🚗</span><div><h2>Registrar entrada</h2><p>La asignación es automática según el tipo del vehículo y la disponibilidad.</p></div></div>
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
            <label htmlFor="tipo-entrada">Tipo de vehículo</label>
            <select
              id="tipo-entrada"
              value={tipoEntrada}
              onChange={(event) => setTipoEntrada(event.target.value as 'moto' | 'carro')}
              disabled={registrandoEntrada}
            >
              <option value="carro">Carro · placa P123ABC</option>
              <option value="moto">Moto · placa M123ABC</option>
            </select>
            <button className="guardian-button guardian-button-primary" disabled={registrandoEntrada}>
              {registrandoEntrada ? 'Registrando...' : 'Registrar y asignar lugar'}
            </button>
          </form>
          <p className="guardian-hint">Si no existe previamente, se registra como visitante para esta entrada. Una placa ya registrada conserva su tipo original.</p>
        </article>

        <article className="guardian-card guardian-exit-card">
          <div className="guardian-card-title"><span>🛡️</span><div><h2>Validar salida</h2><p>Busca por placa, ticket, referencia o QR y confirma el pago antes de liberar el lugar.</p></div></div>
          <form onSubmit={buscarVehiculo} className="guardian-search-row">
            <select aria-label="Tipo de búsqueda" value={tipoBusqueda} onChange={(event) => setTipoBusqueda(event.target.value as TipoBusqueda)} disabled={buscando}>
              <option value="placa">Placa</option>
              <option value="ticket">Ticket</option>
              <option value="referencia">Referencia</option>
              <option value="qr">QR manual</option>
            </select>
            <input
              value={valorBusqueda}
              onChange={(event) => setValorBusqueda(tipoBusqueda === 'placa' ? event.target.value.toUpperCase() : event.target.value)}
              placeholder={placeholderBusqueda(tipoBusqueda)}
              maxLength={limiteBusqueda(tipoBusqueda)}
              disabled={buscando}
              autoComplete="off"
            />
            <button className="guardian-button guardian-button-secondary" disabled={buscando}>{buscando ? 'Buscando...' : 'Buscar'}</button>
          </form>
          <div className="guardian-qr-controls">
            <button type="button" className="guardian-button guardian-button-camera" onClick={() => setLectorActivo((activo) => !activo)} disabled={buscando}>
              {lectorActivo ? 'Cerrar cámara' : '▣ Escanear QR con cámara'}
            </button>
            <span>Referencia: código del comprobante de pago; sirve para buscar una salida sin placa ni ticket.</span>
          </div>
          {lectorActivo && <div className="guardian-qr-reader-wrap"><div id="guardian-qr-reader" /><p>Enfoca el código QR. La cámara se cerrará al detectarlo.</p></div>}

          {vehiculo && (
            <div className="guardian-vehicle-result">
              <div className="guardian-vehicle-main"><strong>{vehiculo.placa}</strong><span>{vehiculo.tipo_vehiculo ?? 'Tipo no disponible'} · {vehiculo.zona}, lugar {vehiculo.lugar}</span><small>Ticket: {vehiculo.numero_ticket}</small></div>
              <span className={`guardian-payment ${esPagoCompletado(vehiculo) ? 'is-paid' : 'is-pending'}`}>
                {esPagoCompletado(vehiculo) ? 'Pago completado' : (vehiculo.pago_estado ?? 'Sin pago')}
              </span>
              <div className="guardian-result-actions">
                <button type="button" className="guardian-button guardian-button-secondary" onClick={() => void validarPago()} disabled={validandoPago || registrandoSalida}>
                  {validandoPago ? 'Validando...' : 'Validar pago'}
                </button>
                <button
                  type="button"
                  className="guardian-button guardian-button-danger"
                  onClick={() => void confirmarSalida()}
                  disabled={!esPagoCompletado(vehiculo) || registrandoSalida || validandoPago}
                  title={!esPagoCompletado(vehiculo) ? 'La salida requiere un pago completado' : 'Confirmar salida y liberar lugar'}
                >
                  {registrandoSalida ? 'Registrando salida...' : 'Confirmar salida'}
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
