import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { vehiculosService } from '../../services/vehiculos.service';
import { parqueoService, type Parqueo } from '../../services/parqueo.service';
import { pagosService, type PrecioInfo } from '../../services/pagos.service';
import type { Vehiculo } from '../../models';
import './ValidarParqueo.css';

const REGEX_PLACA = /^([PM])\d{3}[A-Z]{3}$/;

type EstadoPago = 'pagado' | 'pendiente' | 'sin_pago';

interface ResultadoValidacion {
  parqueo: Parqueo;
  precio: PrecioInfo | null;
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatearMonto(valor: number | string | null | undefined): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor ?? 0));
}

function formatearDuracion(entradaIso?: string | null): string {
  if (!entradaIso) return '—';
  const entrada = new Date(entradaIso);
  if (Number.isNaN(entrada.getTime())) return '—';
  const diffMs = Date.now() - entrada.getTime();
  if (diffMs < 0) return 'Recién ingresado';
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return 'Recién ingresado';
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const minsRestantes = minutos % 60;
  if (horas < 24) return minsRestantes > 0 ? `${horas} h ${minsRestantes} min` : `${horas} h`;
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  return horasRestantes > 0 ? `${dias} d ${horasRestantes} h` : `${dias} d`;
}

function clasificarPago(parqueo: Parqueo): EstadoPago {
  if (parqueo.estado_pago === 'completado') return 'pagado';
  if (parqueo.estado_pago === 'pendiente' || parqueo.estado_pago === 'fallido') return 'pendiente';
  return 'sin_pago';
}

function etiquetaEstado(estado: EstadoPago): string {
  if (estado === 'pagado') return 'Pagado';
  if (estado === 'pendiente') return 'Pago pendiente';
  return 'Sin pago';
}

export function ValidarParqueo() {
  const { usuario } = useAuth();
  const [placa, setPlaca] = useState('');
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargandoVehiculos, setCargandoVehiculos] = useState(true);
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario) return;
    let activo = true;
    (async () => {
      setCargandoVehiculos(true);
      try {
        const data = await vehiculosService.vehiculosPorUsuario(usuario.id);
        if (activo) setVehiculos(data.filter((v) => v.activo !== false));
      } catch {
        if (activo) setVehiculos([]);
      } finally {
        if (activo) setCargandoVehiculos(false);
      }
    })();
    return () => { activo = false; };
  }, [usuario]);

  const estadoPago = useMemo<EstadoPago | null>(
    () => (resultado ? clasificarPago(resultado.parqueo) : null),
    [resultado],
  );

  const montoAPagar = useMemo<number>(() => {
    if (!resultado) return 0;
    if (resultado.parqueo.costo !== null && resultado.parqueo.costo !== undefined) {
      return Number(resultado.parqueo.costo);
    }
    return Number(resultado.precio?.online ?? resultado.precio?.efectivo ?? 0);
  }, [resultado]);

  if (!usuario) {
    return <Navigate to="/login?redirect=/app/validar" replace />;
  }

  const consultar = async (placaAConsultar?: string) => {
    const objetivo = (placaAConsultar ?? placa).trim().toUpperCase();
    if (!objetivo) {
      setError('Ingresa la placa o selecciona uno de tus vehículos registrados');
      return;
    }
    if (!REGEX_PLACA.test(objetivo)) {
      setError('La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras. Ej: P123ABC o M123ABC');
      return;
    }

    setBuscando(true);
    setError('');
    setResultado(null);
    try {
      const parqueo = await parqueoService.obtenerActivoPorPlaca(objetivo);
      if (!parqueo) {
        setError('No hay un parqueo activo para esta placa. Si tu vehículo acaba de entrar, espera unos segundos y vuelve a intentarlo.');
        return;
      }
      let precio: PrecioInfo | null = null;
      if (parqueo.estado_pago !== 'completado') {
        try { precio = await pagosService.precio(parqueo.id); } catch { precio = null; }
      }
      setResultado({ parqueo, precio });
      if (placaAConsultar) setPlaca(objetivo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el parqueo');
    } finally {
      setBuscando(false);
    }
  };

  const manejarSubmit = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    await consultar();
  };

  const limpiar = () => {
    setPlaca('');
    setResultado(null);
    setError('');
  };

  return (
    <section className="validar-page">
      <div className="validar-header">
        <h1 className="validar-title">Validar Parqueo</h1>
        <p className="validar-subtitle">
          Consulta si tu vehículo tiene un parqueo activo y si ya fue pagado. Si registraste vehículos, selecciónalos para validar más rápido.
        </p>
      </div>

      <div className="validar-card">
        <form onSubmit={manejarSubmit} className="validar-form" noValidate>
          <div className="validar-form-grid">
            <div className="form-group validar-placa-group">
              <label className="form-label" htmlFor="validar-placa">Placa del vehículo</label>
              <input
                id="validar-placa"
                className="form-input"
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="Ej. P123ABC"
                maxLength={7}
                disabled={buscando}
                autoComplete="off"
              />
            </div>
            <div className="validar-form-actions">
              <button type="submit" className="validar-btn-primary" disabled={buscando}>
                {buscando ? 'Consultando...' : 'Validar'}
              </button>
              <button type="button" className="validar-btn-secondary" onClick={limpiar} disabled={buscando}>
                Limpiar
              </button>
            </div>
          </div>
        </form>

        {!cargandoVehiculos && vehiculos.length > 0 && (
          <div className="validar-mis-vehiculos">
            <span className="validar-mis-vehiculos-titulo">Mis vehículos registrados</span>
            <div className="validar-mis-vehiculos-lista">
              {vehiculos.map((v) => (
                <button
                  key={v.placa}
                  type="button"
                  className="validar-chip"
                  onClick={() => void consultar(v.placa)}
                  disabled={buscando}
                >
                  {v.placa}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="validar-mensaje validar-mensaje-error" role="alert">
            {error}
          </div>
        )}
      </div>

      {resultado && estadoPago && (
        <article className={`validar-resultado validar-resultado-${estadoPago}`}>
          <header className="validar-resultado-header">
            <div>
              <span className="validar-resultado-placa">{resultado.parqueo.placa}</span>
              <p className="validar-resultado-sub">Ticket {resultado.parqueo.ticket ?? '—'}</p>
            </div>
            <span className={`validar-badge validar-badge-${estadoPago}`}>{etiquetaEstado(estadoPago)}</span>
          </header>

          <div className="validar-resultado-grid">
            <div className="validar-dato">
              <span className="validar-dato-etiqueta">Lugar</span>
              <strong className="validar-dato-valor">{resultado.parqueo.lugar}</strong>
              <small className="validar-dato-extra">Zona {resultado.parqueo.zona}</small>
            </div>
            <div className="validar-dato">
              <span className="validar-dato-etiqueta">Hora de entrada</span>
              <strong className="validar-dato-valor">{formatearFecha(resultado.parqueo.fecha_entrada)}</strong>
              <small className="validar-dato-extra">Hace {formatearDuracion(resultado.parqueo.fecha_entrada)}</small>
            </div>
            <div className="validar-dato">
              <span className="validar-dato-etiqueta">{estadoPago === 'pagado' ? 'Monto pagado' : 'Monto a pagar'}</span>
              <strong className="validar-dato-valor validar-dato-valor-monto">
                {formatearMonto(montoAPagar)}
              </strong>
              {resultado.precio && estadoPago !== 'pagado' && (
                <small className="validar-dato-extra">
                  Efectivo: {formatearMonto(resultado.precio.efectivo)} · En línea: {formatearMonto(resultado.precio.online)}
                </small>
              )}
            </div>
          </div>

          <div className="validar-resultado-mensaje" role="status">
            {estadoPago === 'pagado' && (
              <>
                Tu estancia está pagada. Presenta esta pantalla o el ticket al guardia cuando salgas del parqueo.
              </>
            )}
            {estadoPago === 'pendiente' && (
              <>
                Hay un intento de pago en proceso o fallido. Vuelve a intentarlo desde <Link to={`/app/pagar?placa=${resultado.parqueo.placa}`}>Pagar Parqueo</Link> para completar el pago.
              </>
            )}
            {estadoPago === 'sin_pago' && (
              <>
                Aún no has pagado este parqueo. Puedes hacerlo ahora en línea con tarjeta desde <Link to={`/app/pagar?placa=${resultado.parqueo.placa}`}>Pagar Parqueo</Link>.
              </>
            )}
          </div>
        </article>
      )}
    </section>
  );
}

export default ValidarParqueo;
