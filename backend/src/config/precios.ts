// Precios fijos de parqueo en quetzales
// Efectivo y online: mismo precio
export const PRECIOS: Record<string, { efectivo: number; online: number }> = {
  motocicleta: { efectivo: 22, online: 22 },
  automovil: { efectivo: 27, online: 27 },
  camioneta: { efectivo: 27, online: 27 },
  otro: { efectivo: 27, online: 27 },
};

export function precioPorTipo(tipo: string, metodoPago: 'efectivo' | 'online' = 'efectivo'): number {
  const precios = PRECIOS[tipo] ?? PRECIOS['automovil'];
  if (!precios) return 20;
  return metodoPago === 'online' ? precios.online : precios.efectivo;
}
