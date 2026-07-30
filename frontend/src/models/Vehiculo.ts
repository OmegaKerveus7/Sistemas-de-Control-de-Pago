export interface Vehiculo {
  id?: number;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  tipo: 'automovil' | 'motocicleta' | 'camioneta' | 'otro';
  propietario_dpi: string;
  propietario_nombre: string;
  creado_en?: string;
}
