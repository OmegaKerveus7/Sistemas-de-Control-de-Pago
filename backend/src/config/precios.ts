export const PRECIOS_FIJOS: Record<string, number> = {
  motocicleta: Number(process.env.PRECIO_ONLINE_MOTOCICLETA) || 20,
  automovil: Number(process.env.PRECIO_ONLINE_AUTOMOVIL) || 25,
  camioneta: Number(process.env.PRECIO_ONLINE_CAMIONETA) || 25,
  otro: Number(process.env.PRECIO_ONLINE_OTRO) || 25,
};

export function precioFijo(tipo: string): number | undefined {
  return PRECIOS_FIJOS[tipo];
}