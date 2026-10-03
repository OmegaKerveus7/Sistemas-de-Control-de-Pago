import ExcelJS from 'exceljs';
import type { ReporteDetallado } from '../../services/reportes.service';

// Layout "Registro de Pagos Parqueo" entregado por el área técnica del colegio.
const ZONA_HORARIA = 'America/Guatemala';
const FUENTE = { name: 'Inter', size: 12 };
const BORDE_FINO: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
};

const COLUMNAS = [
  { titulo: 'No.', ancho: 6 },
  { titulo: 'Nombre Completo', ancho: 36 },
  { titulo: 'Número DPI o Carnet', ancho: 24 },
  { titulo: 'Número de ticket', ancho: 19 },
  { titulo: 'Número de Placa', ancho: 18 },
  { titulo: 'Tipo de vehículo', ancho: 19 },
  { titulo: 'Fecha de pago', ancho: 16 },
  { titulo: 'Hora de pago', ancho: 14 },
];

const centrado: Partial<ExcelJS.Alignment> = { horizontal: 'center' };

/** DPI de 13 dígitos como "2000 12345 0101"; cualquier otro valor (carnet) se deja tal cual. */
export function formatearDpi(dpi: string): string {
  const valor = dpi.trim();
  return /^\d{13}$/.test(valor) ? `${valor.slice(0, 4)} ${valor.slice(4, 9)} ${valor.slice(9)}` : valor;
}

/** "P857OPL" -> "P-857OPL". */
export function formatearPlaca(placa: string): string {
  const valor = placa.trim().toUpperCase();
  return /^[A-Z]\d/.test(valor) ? `${valor[0]}-${valor.slice(1)}` : valor;
}

/** "carro" -> "Carro". */
export function formatearTipoVehiculo(tipo: string): string {
  const valor = tipo.trim();
  return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
}

/**
 * Fecha y hora de pago en hora de Guatemala. Excel no guarda zona horaria, así que la fecha se
 * escribe como medianoche UTC y la hora como fracción del día: se ven igual en cualquier equipo.
 */
export function fechaYHoraDePago(iso: string): { fecha: Date; hora: number } {
  const partes: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(iso))) partes[p.type] = p.value;
  return {
    fecha: new Date(Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day))),
    hora: (Number(partes.hour) * 3600 + Number(partes.minute) * 60 + Number(partes.second)) / 86400,
  };
}

/** Libro con un registro por cada pago completado, en orden cronológico. */
export function crearLibroPagos(detalle: ReporteDetallado[], nombreHoja: string): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Sistema de Parqueo Zona 19';
  libro.created = new Date();

  const hoja = libro.addWorksheet(nombreHoja, { views: [{ showGridLines: false }] });
  hoja.columns = COLUMNAS.map((c) => ({ width: c.ancho }));

  const encabezado = hoja.addRow(COLUMNAS.map((c) => c.titulo));
  encabezado.eachCell((celda) => {
    celda.font = { ...FUENTE, bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
  });

  const pagos = detalle
    .filter((d) => d.estado === 'completado')
    .sort((a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime());

  pagos.forEach((d, i) => {
    const { fecha, hora } = fechaYHoraDePago(d.fecha_pago);
    const fila = hoja.addRow([
      i + 1,
      d.nombre_completo?.trim() || 'Visitante',
      formatearDpi(d.dpi ?? ''),
      d.id_ticket,
      formatearPlaca(d.placa),
      formatearTipoVehiculo(d.tipo_vehiculo),
      fecha,
      hora,
    ]);
    fila.eachCell({ includeEmpty: true }, (celda) => {
      celda.font = FUENTE;
      celda.border = BORDE_FINO;
      celda.alignment = centrado;
    });
    fila.getCell(2).alignment = {};
    fila.getCell(4).numFmt = '00000';
    fila.getCell(7).numFmt = 'mm-dd-yy';
    fila.getCell(8).numFmt = 'h:mm:ss';
  });

  return libro;
}
