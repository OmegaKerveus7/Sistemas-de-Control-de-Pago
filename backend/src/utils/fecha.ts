/**
 * Día calendario actual en Guatemala (YYYY-MM-DD). La vigencia de un pago se calcula aquí y no con
 * CURDATE(): el servidor MySQL puede estar en UTC y "hoy" cambiaría a las 6 p. m. hora local.
 */
export function hoyGuatemala(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}
