import type { NombreRol } from '../../models';
import { OPCIONES_POR_ROL } from './Menu';

/** Pantalla principal de cada rol: la primera opción de su menú. */
export function rutaInicialPorRol(rol: NombreRol | undefined): string {
  return (rol && OPCIONES_POR_ROL[rol]?.[0]?.path) || '/login';
}
