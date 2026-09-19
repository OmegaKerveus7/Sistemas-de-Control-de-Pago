import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { parqueoService, type ValidarParqueoRespuesta } from '../../services/parqueo.service';
import './ValidarParqueoPublico.css';

const REGEX_PLACA = /^([PM])\d{3}[A-Z]{3}$/;

const IconoVolver = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

function construirQrVehiculo(placa: string): string {
  return `BELEN-VEH|v1|${placa.toUpperCase()}`;
}

function formatearMonto(valor: number | string | null | undefined): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor ?? 0));
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

interface ResultadoCompleto {
  estadoHttp: number;
  mensajeHttp: string;
  data: ValidarParqueoRespuesta | null;
}

export function ValidarParqueoPublico() {
  const navigate = useNavigate();
  const [placa, setPlaca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<ResultadoCompleto | null>(null);

  const consultar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const limpia = placa.trim().toUpperCase();
    if (!limpia) {
      setError('Ingresa la placa del vehículo');
      return;
    }
    if (!REGEX_PLACA.test(limpia)) {
      setError('La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras. Ej: P123ABC o M123ABC');
      return;
    }

    setBuscando(true);
    setError('');
    setResultado(null);
    try {
      const res = await parqueoService.validarPorPlaca(limpia);
      setResultado({
        estadoHttp: res.codigo,
        mensajeHttp: res.mensaje,
        data: res.data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el parqueo');
    } finally {
      setBuscando(false);
    }
  };

  const limpiar = () => {
    setPlaca('');
    setResultado(null);
    setError('');
  };

  const estado = resultado?.data?.estado ?? null;

  return (
    <div className="vp-page">
      <header className="vp-header">
        <button type="button" className="vp-volver" onClick={() => navigate('/')}>
          <IconoVolver /> Volver al inicio
        </button>
        <h1 className="vp-title">Validar Parqueo</h1>
        <p className="vp-subtitle">
          Ingresa tu placa para conocer el estado de tu parqueo y, si tu vehículo está registrado,
          obtener el QR para presentar al guardia al salir.
        </p>
      </header>

      <main className="vp-main">
        <form onSubmit={consultar} className="vp-form" noValidate>
          <label htmlFor="vp-placa" className="vp-label">Placa del vehículo</label>
          <div className="vp-form-row">
            <input
              id="vp-placa"
              className="vp-input"
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="Ej. P123ABC"
              maxLength={7}
              disabled={buscando}
              autoComplete="off"
            />
            <button type="submit" className="vp-btn-primary" disabled={buscando}>
              {buscando ? 'Validando...' : 'Validar'}
            </button>
            <button type="button" className="vp-btn-secondary" onClick={limpiar} disabled={buscando}>
              Limpiar
            </button>
          </div>
          {error && <p className="vp-error" role="alert">{error}</p>}
        </form>

        {resultado && (
          <section className={`vp-resultado vp-resultado-${estado ?? 'error'}`} aria-live="polite">
            <header className="vp-resultado-header">
              <span className="vp-resultado-placa">{resultado.data?.placa ?? placa.toUpperCase()}</span>
              <span className={`vp-badge vp-badge-${estado ?? 'error'}`}>
                {estado === 'con_parqueo' && 'Parqueo pagado'}
                {estado === 'sin_pago' && 'Pendiente de pago'}
                {estado === 'sin_parqueo' && 'Sin parqueo activo'}
                {estado === 'no_registrada' && 'Placa no registrada'}
                {!estado && 'Sin información'}
              </span>
            </header>

            {estado === 'con_parqueo' && resultado.data && (
              <>
                <div className="vp-grid">
                  <div className="vp-dato">
                    <span className="vp-dato-etiqueta">Lugar</span>
                    <strong className="vp-dato-valor">{resultado.data.parqueo?.codigo ?? '—'}</strong>
                    <small className="vp-dato-extra">Zona {resultado.data.parqueo?.zona ?? '—'}</small>
                  </div>
                  <div className="vp-dato">
                    <span className="vp-dato-etiqueta">Vehículo</span>
                    <strong className="vp-dato-valor">
                      {[resultado.data.vehiculo?.tipo, resultado.data.vehiculo?.marca, resultado.data.vehiculo?.color]
                        .filter(Boolean).join(' · ') || 'No registrado'}
                    </strong>
                  </div>
                  <div className="vp-dato">
                    <span className="vp-dato-etiqueta">Pagado</span>
                    <strong className="vp-dato-valor">{formatearMonto(resultado.data.pago?.monto)}</strong>
                    <small className="vp-dato-extra">
                      {resultado.data.pago?.metodo_pago === 'efectivo' ? 'Efectivo' : 'Tarjeta'} · {formatearFecha(resultado.data.pago?.fecha_pago)}
                    </small>
                  </div>
                </div>
                <p className="vp-mensaje vp-mensaje-exito">
                  Tu vehículo tiene el parqueo pagado. Presenta el siguiente QR al guardia para registrar tu salida.
                </p>
                <div className="vp-qr-block">
                  <QRCodeSVG
                    id={`vp-qr-${resultado.data.placa}`}
                    value={construirQrVehiculo(resultado.data.placa ?? '')}
                    size={200}
                    level="M"
                    includeMargin
                  />
                  <p className="vp-qr-ayuda">
                    Código de validación: <strong>{resultado.data.codigo_validacion ?? '—'}</strong>
                  </p>
                  <button
                    type="button"
                    className="vp-btn-secondary"
                    onClick={() => {
                      const svg = document.getElementById(`vp-qr-${resultado.data?.placa}`);
                      if (!svg) return;
                      const serializer = new XMLSerializer();
                      const source = serializer.serializeToString(svg);
                      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `vehiculo-${resultado.data?.placa ?? placa}.svg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Descargar QR
                  </button>
                </div>
              </>
            )}

            {estado === 'sin_pago' && resultado.data && (
              <>
                <p className="vp-mensaje vp-mensaje-warn">
                  Tu vehículo está dentro del parqueo pero el pago aún no se ha completado.
                </p>
                <div className="vp-grid">
                  <div className="vp-dato">
                    <span className="vp-dato-etiqueta">Lugar</span>
                    <strong className="vp-dato-valor">{resultado.data.parqueo?.codigo ?? '—'}</strong>
                    <small className="vp-dato-extra">Zona {resultado.data.parqueo?.zona ?? '—'}</small>
                  </div>
                  <div className="vp-dato">
                    <span className="vp-dato-etiqueta">Vehículo</span>
                    <strong className="vp-dato-valor">
                      {[resultado.data.vehiculo?.tipo, resultado.data.vehiculo?.marca, resultado.data.vehiculo?.color]
                        .filter(Boolean).join(' · ') || 'No registrado'}
                    </strong>
                  </div>
                </div>
                <p className="vp-mensaje-secundario">
                  Realiza el pago ahora desde <Link to={`/pagar-parqueo?placa=${resultado.data.placa ?? placa}`}>Pagar Parqueo</Link> para poder salir.
                </p>
              </>
            )}

            {estado === 'sin_parqueo' && (
              <p className="vp-mensaje vp-mensaje-info">
                No hay un parqueo activo para esta placa. Si acabas de ingresar, espera unos segundos y vuelve a intentarlo.
              </p>
            )}

            {estado === 'no_registrada' && (
              <p className="vp-mensaje vp-mensaje-info">
                Esta placa no figura en el sistema. Verifica que esté escrita correctamente (formato P123ABC / M123ABC). Si acabas de registrarte, espera unos segundos a que se sincronice el registro.
              </p>
            )}

            {!estado && (
              <p className="vp-mensaje vp-mensaje-error">
                {resultado.mensajeHttp || 'No se pudo obtener información del parqueo.'}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default ValidarParqueoPublico;
