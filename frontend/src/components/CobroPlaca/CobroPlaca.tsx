import { useCallback, useEffect, useState } from 'react';
import { pagosService, type ConsultaPlaca } from '../../services/pagos.service';
import { REGEX_PLACA } from '../../utils/placa';
import './CobroPlaca.css';

const REGEX_NIT = /^\d{4,12}[\dK]$/;

interface Props {
  placa: string;
  /** Se consulta de nuevo cada tanto mientras la placa no haya pagado (por si paga en línea). */
  sondeoMs?: number;
  onCobrado?: (monto: number) => void;
}

const quetzales = (valor: number | string) => `Q${Number(valor).toFixed(2)}`;

/**
 * Estado de pago de una placa para el personal, con cobro en efectivo sin necesidad de ticket:
 * el pago queda vigente para hoy y la entrada del guardia lo enlaza al ticket.
 */
export function CobroPlaca({ placa, sondeoMs = 8000, onCobrado }: Props) {
  const valida = REGEX_PLACA.test(placa);
  const [consulta, setConsulta] = useState<ConsultaPlaca | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [consumidorFinal, setConsumidorFinal] = useState(true);
  const [nit, setNit] = useState('');
  const [nombre, setNombre] = useState('');

  const cargar = useCallback(async (placaActual: string, esActivo: () => boolean) => {
    try {
      const datos = await pagosService.permisoDePlaca(placaActual);
      if (!esActivo()) return;
      setConsulta(datos);
      setError('');
    } catch (err) {
      if (esActivo()) { setConsulta(null); setError(err instanceof Error ? err.message : 'No se pudo consultar el pago'); }
    }
  }, []);

  useEffect(() => {
    setExito('');
    if (!valida) { setConsulta(null); setError(''); return; }
    let activo = true;
    const esActivo = () => activo;
    setConsulta(null);
    const inicio = window.setTimeout(() => void cargar(placa, esActivo), 250);
    const sondeo = sondeoMs > 0 ? window.setInterval(() => void cargar(placa, esActivo), sondeoMs) : undefined;
    return () => { activo = false; window.clearTimeout(inicio); if (sondeo) window.clearInterval(sondeo); };
  }, [placa, valida, sondeoMs, cargar]);

  if (!valida) return null;
  if (error && !consulta) return <p className="cobro-aviso cobro-aviso-error" role="alert">{error}</p>;
  if (!consulta) return <p className="cobro-aviso" role="status">Consultando pago de {placa}…</p>;

  const cobrar = async () => {
    setError(''); setExito('');
    const nitLimpio = consumidorFinal ? 'CF' : nit.toUpperCase().replace(/[\s-]/g, '');
    if (!consumidorFinal) {
      if (!REGEX_NIT.test(nitLimpio)) { setError('El NIT no es válido. Usa solo números (y K al final si aplica).'); return; }
      if (nombre.trim().length < 3) { setError('Ingresa el nombre del recibo.'); return; }
    }
    setCobrando(true);
    try {
      const r = await pagosService.registrarEfectivo({
        placa: consulta.placa, id_tipo_vehiculo: consulta.id_tipo, nit: nitLimpio, ...(consumidorFinal ? {} : { nombre: nombre.trim() }),
      });
      setExito(`Cobro registrado: ${quetzales(r.monto)} en efectivo. Vigente hoy.`);
      setNit(''); setNombre(''); setConsumidorFinal(true);
      onCobrado?.(r.monto);
      await cargar(consulta.placa, () => true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el cobro');
      await cargar(consulta.placa, () => true);
    } finally {
      setCobrando(false);
    }
  };

  const enLineaPendiente = consulta.estado_pago === 'pendiente' || consulta.estado_pago === 'fallido';
  return (
    <div className="cobro-panel">
      {consulta.pagado_hoy ? (
        <p className="cobro-estado cobro-estado-pagado">
          ✔ {consulta.placa} pagó hoy · {consulta.pago?.metodo === 'efectivo' ? 'Efectivo' : 'Tarjeta'} · {quetzales(consulta.pago?.monto ?? 0)}
        </p>
      ) : (
        <p className="cobro-estado cobro-estado-pendiente">
          Sin pago hoy · {consulta.tipo === 'moto' ? 'Moto' : 'Carro'}{consulta.registrada ? '' : ' (visitante)'} · {quetzales(consulta.tarifa_efectivo)} efectivo / {quetzales(consulta.tarifa_online)} tarjeta
        </p>
      )}

      {!consulta.pagado_hoy && enLineaPendiente && (
        <p className="cobro-aviso">Tiene un pago con tarjeta iniciado y sin completar. Si ya pagó, espera unos segundos; mientras siga pendiente no se puede cobrar en efectivo.</p>
      )}

      {!consulta.pagado_hoy && !enLineaPendiente && (
        <div className="cobro-form">
          <label className="cobro-check">
            <input type="checkbox" checked={consumidorFinal} onChange={(e) => setConsumidorFinal(e.target.checked)} disabled={cobrando} />
            Recibo a Consumidor Final (CF)
          </label>
          {!consumidorFinal && (
            <div className="cobro-campos">
              <input placeholder="NIT" value={nit} maxLength={14} onChange={(e) => setNit(e.target.value.toUpperCase())} disabled={cobrando} aria-label="NIT" />
              <input placeholder="Nombre del recibo" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} disabled={cobrando} aria-label="Nombre del recibo" />
            </div>
          )}
          <button type="button" className="cobro-boton" onClick={() => void cobrar()} disabled={cobrando}>
            {cobrando ? 'Registrando cobro…' : `Cobrar ${quetzales(consulta.tarifa_efectivo)} en efectivo`}
          </button>
        </div>
      )}

      {exito && <p className="cobro-aviso cobro-aviso-exito" role="status">{exito}</p>}
      {error && <p className="cobro-aviso cobro-aviso-error" role="alert">{error}</p>}
    </div>
  );
}

export default CobroPlaca;
