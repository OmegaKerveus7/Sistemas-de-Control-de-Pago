import * as online from './pagos-online.service';
import * as pasarela from './pasarela.service';
import * as onlineRepo from '../repositories/pagos-online.repository';
import * as repo from '../repositories/pagos-publico.repository';
import { FacturacionError, validarFacturacion } from '../utils/facturacion';

export const consultar = (placa: string) => repo.consultarPlaca(placa);
export const consultarDetalle = (placa: string) => repo.consultarPlaca(placa, true);
export const estadoDelDia = repo.estadoDelDia;

export async function crear(placa: string, nit: unknown, nombre: unknown, montoEsperado: number) {
  let facturacion;
  try { facturacion = validarFacturacion(nit, nombre); }
  catch (error) {
    if (error instanceof FacturacionError) throw new pasarela.PagoError(400, error.message);
    throw error;
  }
  const modo = pasarela.validarConfiguracionPago();
  return online.prepararCheckout(await repo.reservarPublico(placa, facturacion, modo, montoEsperado), modo);
}

/** Estado del pago por su referencia (secreta, 72 bits). El recibo solo se entrega con el pago aprobado. */
export async function confirmar(referencia: string) {
  const resultado = await online.confirmar(referencia);
  if (!resultado.aprobado) return resultado;
  const pago = await onlineRepo.porReferencia(referencia);
  return {
    ...resultado,
    recibo: {
      referencia: pago.codigo_validacion,
      placa: pago.placa,
      monto: Number(pago.monto),
      metodo: 'linea' as const,
      nit: pago.nit ?? null,
      nombre: pago.nombre_facturacion ?? null,
      fecha_vigencia: pago.fecha_vigencia ?? null,
      fecha_pago: pago.fecha_confirmacion ?? pago.fecha_pago ?? null,
    },
  };
}

export const simular = (referencia: string, estado: string) => online.simular(referencia, undefined, estado);
