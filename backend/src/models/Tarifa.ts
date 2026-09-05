export interface Tarifa {
  id_tarifa: number;
  id_tipo_vehiculo: number;
  nom_tipo_vehiculo: string;
  id_tipo_pago: number;
  nom_tipo_pago: string;
  precio: number;
  costo_transaccion: number | null;
  ganancia: number | null;
  activo: boolean;
  fecha_creacion: string;
  fecha_modificacion: string | null;
}
