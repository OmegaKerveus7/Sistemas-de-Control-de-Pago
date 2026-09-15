import * as repo from '../repositories/pagos-online.repository';
import * as pasarela from './pasarela.service';

function validarAmbiente(pago: repo.PagoOnline) {
  if (repo.gateway(pago)?.modo !== pasarela.modoPago()) throw new pasarela.PagoError(409, 'El pago pertenece a otro ambiente');
}
function resultado(pago: repo.PagoOnline) {
  return { aprobado: pago.estado_pago === 'completado', estado: pago.estado_pago, monto: Number(pago.monto),
    referencia: pago.codigo_validacion, modo: repo.gateway(pago).modo, url_pago: repo.gateway(pago).url_pago, placa: pago.placa };
}
export async function crear(parqueoId: number, usuario: number, monto: number) {
  const modo = pasarela.validarConfiguracionPago();
  const { pago, nuevo } = await repo.reservar(parqueoId, usuario, modo, monto);
  if (!nuevo) {
    const url = repo.gateway(pago).url_pago;
    if (!url) throw new pasarela.PagoError(409, `El pago ${pago.codigo_validacion} está en preparación o requiere revisión. No se generará otro cobro.`);
    return { url_pago: url, referencia: pago.codigo_validacion, modo };
  }
  // La reserva ya está persistida: si la respuesta se pierde, nunca creamos otro checkout a ciegas.
  try {
    const checkout = await pasarela.crearCheckout({ referencia: pago.codigo_validacion, monto: Number(pago.monto), placa: pago.placa });
    await repo.guardarCheckout(pago, checkout);
    return { url_pago: checkout.url_pago, referencia: pago.codigo_validacion, modo };
  } catch {
    throw new pasarela.PagoError(502, `No se pudo preparar el pago ${pago.codigo_validacion}. Consulta con administración antes de reintentar para evitar otro cobro.`);
  }
}
export async function sincronizar(pago: repo.PagoOnline) {
  validarAmbiente(pago);
  if (pago.estado_pago === 'completado' || pago.estado_pago === 'reembolsado' || pasarela.modoPago() === 'mock' || !pago.transaction_id) return resultado(pago);
  const checkout = await pasarela.obtenerCheckout(pago.transaction_id);
  if (pasarela.validarCheckout(checkout, pago, pasarela.modoPago())) await repo.actualizarEstado(pago.id_pago, 'completado');
  return resultado(await repo.porReferencia(pago.codigo_validacion));
}
export async function confirmar(referencia: string, usuario: number) { return sincronizar(await repo.porReferencia(referencia, usuario)); }
export async function simular(referencia: string, usuario: number, estado: string) {
  if (pasarela.modoPago() !== 'mock') throw new pasarela.PagoError(404, 'Simulador no disponible');
  if (!['completado', 'fallido', 'pendiente'].includes(estado)) throw new pasarela.PagoError(400, 'Resultado de prueba inválido');
  const pago = await repo.porReferencia(referencia, usuario);
  validarAmbiente(pago);
  await repo.actualizarEstado(pago.id_pago, estado as 'completado' | 'fallido' | 'pendiente');
  return resultado(await repo.porReferencia(referencia, usuario));
}
export async function webhook(body: Buffer, headers: { id?: string; timestamp?: string; signature?: string }) {
  if (pasarela.modoPago() === 'mock') throw new pasarela.PagoError(404, 'Webhook no disponible');
  pasarela.verificarFirma(body, headers);
  let event: { event_type?: string; checkout?: { id?: string } };
  try { event = JSON.parse(body.toString('utf8')); } catch { throw new pasarela.PagoError(400, 'JSON inválido'); }
  if (!event || !['intent.succeeded', 'intent.pending', 'intent.failed', 'intent.canceled'].includes(event.event_type || '') || !event.checkout?.id) return;
  // Reconsultamos la API: el evento es una señal, no la fuente del monto ni del estado final.
  const checkout = await pasarela.obtenerCheckout(event.checkout.id);
  if (!checkout.metadata?.referencia) return;
  let pago: repo.PagoOnline;
  try { pago = await repo.porReferencia(checkout.metadata.referencia); }
  catch (error) { if (error instanceof pasarela.PagoError && error.status === 404) return; throw error; }
  validarAmbiente(pago);
  pasarela.validarCheckout(checkout, { ...pago, transaction_id: pago.transaction_id || checkout.id }, pasarela.modoPago());
  if (!pago.transaction_id) {
    // Recupera una creación cuyo resultado HTTP se perdió, sin duplicar el cobro.
    await repo.guardarCheckout(pago, { id: checkout.id, url_pago: pasarela.urlRetorno(pago.codigo_validacion) });
  }
  if (checkout.status === 'paid') await repo.actualizarEstado(pago.id_pago, 'completado');
  else if (event.event_type === 'intent.failed' && checkout.status === 'unpaid') await repo.actualizarEstado(pago.id_pago, 'fallido');
}

let reconciliando = false;
let ultimoId = 0;
export async function reconciliarPendientes() {
  if (reconciliando || pasarela.modoPago() === 'mock') return;
  reconciliando = true;
  try {
    const pagos = await repo.pendientes(ultimoId);
    for (const pago of pagos) {
      ultimoId = pago.id_pago;
      if (repo.gateway(pago)?.modo !== pasarela.modoPago()) continue;
      try { await sincronizar(pago); } catch { console.error(`[Pagos] No se pudo reconciliar ${pago.codigo_validacion}`); }
    }
    if (pagos.length < 100) ultimoId = 0;
  } finally { reconciliando = false; }
}
