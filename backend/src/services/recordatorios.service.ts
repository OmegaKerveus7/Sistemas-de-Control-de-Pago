import * as recordatoriosRepo from '../repositories/recordatorios.repository';
import * as correoService from './correo.service';

export interface ResultadoRecordatorio {
  ticket: string;
  placa: string;
  resultado: 'enviado' | 'omitido' | 'error';
}

export interface ResumenRecordatorios {
  total: number;
  enviados: number;
  omitidos: number;
  errores: number;
  detalle: ResultadoRecordatorio[];
}

// Último envío por ticket, en memoria: evita mandar dos recordatorios seguidos. Se reinicia con el servidor.
const ultimoEnvio = new Map<number, number>();

function intervaloMs(): number {
  return (Number(process.env.RECORDATORIO_INTERVALO_MIN) || 60) * 60_000;
}

/**
 * Envía un recordatorio de pago a cada usuario normal con un ticket activo sin pagar.
 * Con `idTicket` solo se considera ese ticket. `enviar` permite sustituir el correo real en pruebas.
 */
export async function enviarRecordatorios(
  idTicket?: number,
  enviar: typeof correoService.enviarRecordatorioPago = correoService.enviarRecordatorioPago,
): Promise<ResumenRecordatorios> {
  const pendientes = await recordatoriosRepo.listarPendientesDePago(idTicket);
  const detalle: ResultadoRecordatorio[] = [];

  const ahora = Date.now();
  for (const [ticket, momento] of ultimoEnvio) if (ahora - momento >= intervaloMs()) ultimoEnvio.delete(ticket);

  for (const p of pendientes) {
    const base = { ticket: p.ticket, placa: p.placa };
    if (ultimoEnvio.has(p.id_ticket)) {
      detalle.push({ ...base, resultado: 'omitido' });
      continue;
    }
    // Se reserva antes de enviar: dos peticiones simultáneas (doble clic) no deben mandar dos correos.
    ultimoEnvio.set(p.id_ticket, Date.now());
    try {
      await enviar({
        correoDestino: p.email,
        nombreUsuario: `${p.nombres} ${p.apellidos}`.trim(),
        placa: p.placa,
        ticket: p.ticket,
        tipoVehiculo: p.tipo_vehiculo,
        lugar: p.lugar,
        zona: p.zona,
        minutosEstacionado: p.minutos_estacionado,
        precioLinea: p.precio_linea,
        precioEfectivo: p.precio_efectivo,
      });
      detalle.push({ ...base, resultado: 'enviado' });
    } catch (err) {
      ultimoEnvio.delete(p.id_ticket); // no se envió: el siguiente intento no debe quedar bloqueado
      console.error('[Recordatorio]', p.ticket, err instanceof Error ? err.message : err);
      detalle.push({ ...base, resultado: 'error' });
    }
  }

  const cuenta = (r: ResultadoRecordatorio['resultado']) => detalle.filter((d) => d.resultado === r).length;
  return { total: detalle.length, enviados: cuenta('enviado'), omitidos: cuenta('omitido'), errores: cuenta('error'), detalle };
}
