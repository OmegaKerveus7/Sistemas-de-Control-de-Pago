import { PublicHeader } from '../../components/PublicHeader/PublicHeader';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pagosService, type ConsultaPlaca } from '../../services/pagos.service';
import { FormularioRecurrente } from '../PagarParqueo/FormularioRecurrente';
import { formatoDia, formatoQuetzales } from '../../utils/formato';
import { REGEX_PLACA } from '../../utils/placa';
import '../PagarParqueo/PagarParqueo.css';
import './PagoPublico.css';

const REGEX_NIT = /^\d{4,12}[\dK]$/;

/** Pago de parqueo sin sesión: se llega desde el QR de la entrada. */
export function PagoPublico() {
  const [params] = useSearchParams();
  const [placa, setPlaca] = useState(() => (params.get('placa') || '').toUpperCase());
  const [consulta, setConsulta] = useState<ConsultaPlaca | null>(null);
  const [consumidorFinal, setConsumidorFinal] = useState(true);
  const [nit, setNit] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [checkout, setCheckout] = useState<{ url_pago: string; referencia: string; modo: 'mock' | 'sandbox' | 'live' } | null>(null);

  const reiniciar = () => {
    setConsulta(null); setCheckout(null); setError(''); setPlaca(''); setNit(''); setNombre(''); setConsumidorFinal(true);
  };

  const buscar = async (e: FormEvent) => {
    e.preventDefault();
    const limpia = placa.trim().toUpperCase();
    setError('');
    setConsulta(null);
    if (!REGEX_PLACA.test(limpia)) {
      setError('La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras. Ej: P123ABC');
      return;
    }
    setBuscando(true);
    try {
      setConsulta(await pagosService.consultarPlaca(limpia));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar la placa');
    } finally {
      setBuscando(false);
    }
  };

  const pagar = async (e: FormEvent) => {
    e.preventDefault();
    if (!consulta) return;
    const nitLimpio = consumidorFinal ? 'CF' : nit.toUpperCase().replace(/[\s-]/g, '');
    if (!consumidorFinal) {
      if (!REGEX_NIT.test(nitLimpio)) { setError('El NIT no es válido. Usa solo números (y K al final si aplica).'); return; }
      if (nombre.trim().length < 3) { setError('Ingresa el nombre al que se emitirá el recibo.'); return; }
    }
    setPagando(true);
    setError('');
    try {
      const resultado = await pagosService.crearPublico({
        placa: consulta.placa, nit: nitLimpio, nombre: consumidorFinal ? '' : nombre.trim(), monto_esperado: consulta.tarifa_online,
      });
      if (resultado.modo === 'mock') window.location.href = resultado.url_pago;
      else setCheckout(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago');
    } finally {
      setPagando(false);
    }
  };

  const enCheckout = checkout !== null && consulta !== null;
  return (
    <div className={`public-page pagar-page${enCheckout ? ' pagar-page-checkout' : ''}`}>
      <PublicHeader />

      <main className={`pagar-main${enCheckout ? ' pagar-main-checkout' : ''}`}>
        <h1 className="pagar-title">Pagar parqueo</h1>
        <p className="pagar-subtitle" hidden={enCheckout}>
          Ingresa tu placa para pagar con tarjeta. El pago vale por todo el día.
        </p>

        {error && <div className="pagar-alerta pagar-alerta-error" role="alert">{error}</div>}

        {!consulta && (
          <form className="pagar-card" onSubmit={buscar}>
            <label className="pagar-label" htmlFor="placa">Placa del vehículo</label>
            <input id="placa" className="pagar-input pagar-input-placa" placeholder="Ej. P123ABC" value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())} disabled={buscando} maxLength={7}
              autoComplete="off" autoCapitalize="characters" inputMode="text" />
            <button type="submit" className="pagar-button" disabled={buscando || !placa}>
              {buscando ? 'Consultando...' : 'Continuar'}
            </button>
          </form>
        )}

        {consulta?.pagado_hoy && (
          <div className="pagar-card pagar-resultado pagar-resultado-aprobado">
            <h2 className="pagar-resumen-titulo">Esta placa ya pagó hoy</h2>
            <p className="pagar-resumen-linea"><span>Placa</span><strong>{consulta.placa}</strong></p>
            <p className="pagar-resumen-linea"><span>Válido</span><strong>{formatoDia(consulta.fecha_vigencia)}</strong></p>
            <p className="pagar-subtitle">Puedes presentar esta placa al guardia.</p>
            <button type="button" className="pagar-button pagar-button-secundario" onClick={reiniciar}>Consultar otra placa</button>
          </div>
        )}

        {consulta && !consulta.pagado_hoy && (
          <div className={enCheckout ? 'pagar-checkout-layout' : undefined}>
            <form className="pagar-card pagar-resumen" onSubmit={pagar}>
              <h2 className="pagar-resumen-titulo">Resumen de pago</h2>
              <p className="pagar-resumen-linea"><span>Placa</span><strong>{consulta.placa}</strong></p>
              <p className="pagar-resumen-linea"><span>Válido para</span><strong>{formatoDia(consulta.fecha_vigencia)}</strong></p>
              <p className="pagar-resumen-linea pagar-resumen-total"><span>Total a pagar</span><strong>{formatoQuetzales(consulta.tarifa_online)}</strong></p>

              {!enCheckout && (
                <fieldset className="pagar-facturacion" disabled={pagando}>
                  <legend>Datos para tu recibo</legend>
                  <label className="pagar-check">
                    <input type="checkbox" checked={consumidorFinal} onChange={(e) => setConsumidorFinal(e.target.checked)} />
                    Consumidor final (CF)
                  </label>
                  {!consumidorFinal && (
                    <>
                      <label className="pagar-label" htmlFor="nit">NIT</label>
                      <input id="nit" className="pagar-input" value={nit} maxLength={14} inputMode="text" autoComplete="off"
                        onChange={(e) => setNit(e.target.value.toUpperCase())} placeholder="Ej. 1234567-8" />
                      <label className="pagar-label" htmlFor="nombre">Nombre</label>
                      <input id="nombre" className="pagar-input" value={nombre} maxLength={120} autoComplete="name"
                        onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo o razón social" />
                    </>
                  )}
                </fieldset>
              )}

              {!enCheckout && (
                <button type="submit" className="pagar-button" disabled={pagando}>
                  {pagando ? 'Preparando pago...' : `Pagar ${formatoQuetzales(consulta.tarifa_online)} con tarjeta`}
                </button>
              )}
              <button type="button" className="pagar-button pagar-button-secundario" onClick={reiniciar} disabled={pagando}>
                Cambiar placa
              </button>
            </form>
            {checkout && (
              <div className="pagar-card pagar-tarjeta">
                <FormularioRecurrente url={checkout.url_pago} referencia={checkout.referencia}
                  sandbox={checkout.modo === 'sandbox'} confirmar={pagosService.confirmarPublico} />
              </div>
            )}
          </div>
        )}

        <p className="pagar-pie">¿Prefieres pagar en efectivo? Hazlo con el guardia antes de salir.</p>
      </main>
    </div>
  );
}

export default PagoPublico;
