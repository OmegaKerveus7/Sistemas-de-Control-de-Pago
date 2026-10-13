export interface DatosFacturacion {
  nit: string;
  nombre: string;
}

export class FacturacionError extends Error {
  constructor(message: string) { super(message); }
}

const REGEX_NIT = /^\d{4,12}[\dK]$/;

/**
 * NIT guatemalteco o "CF" (consumidor final). Solo valida el formato: aceptar un NIT válido de SAT
 * que no pase un dígito verificador mal implementado sería peor que dejar pasar un error de dedo.
 */
export function validarFacturacion(nitCrudo: unknown, nombreCrudo: unknown): DatosFacturacion {
  const nit = typeof nitCrudo === 'string' ? nitCrudo.toUpperCase().replace(/[\s-]/g, '') : '';
  if (!nit) throw new FacturacionError('Ingresa tu NIT, o CF si no necesitas factura a tu nombre');
  const esCF = nit === 'CF';
  if (!esCF && !REGEX_NIT.test(nit)) throw new FacturacionError('El NIT no es válido. Usa solo números (y K al final si aplica) o CF');

  const nombre = typeof nombreCrudo === 'string' ? nombreCrudo.trim().replace(/\s+/g, ' ') : '';
  if (nombre.length > 120) throw new FacturacionError('El nombre no puede superar 120 caracteres');
  if (!esCF && nombre.length < 3) throw new FacturacionError('Ingresa el nombre al que se emitirá el recibo');
  return { nit, nombre: nombre || 'Consumidor Final' };
}
