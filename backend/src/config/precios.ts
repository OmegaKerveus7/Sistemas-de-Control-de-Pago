// Precios fijos de parqueo en quetzales
// Efectivo: 15 moto, 20 vehículo
// Pago online: se suma comisión de la API de pagos
export const PRECIOS: Record<string, { efectivo: number; online: number }> = {
  motocicleta: { efectivo: 15, online: 20 },
  automovil: { efectivo: 20, online: 25 },
  camioneta: { efectivo: 20, online: 25 },
  otro: { efectivo: 20, online: 25 },
};

export function precioPorTipo(tipo: string, metodoPago: 'efectivo' | 'online' = 'efectivo'): number {
  const precios = PRECIOS[tipo] ?? PRECIOS.automovil;
  return metodoPago === 'online' ? precios.online : precios.efectivo;
}
