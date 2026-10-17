export const formatoQuetzales = (valor: number | string) => `Q${Number(valor).toFixed(2)}`;

/** Día calendario "YYYY-MM-DD" (o ISO) en texto largo, sin desplazarlo por zona horaria. */
export function formatoDia(dia: string | null | undefined): string {
  if (!dia) return '—';
  const [anio, mes, diaMes] = dia.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !diaMes) return dia;
  return new Date(anio, mes - 1, diaMes).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
