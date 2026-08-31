import * as tokensRepo from '../repositories/tokens.repository';
import * as usuariosRepo from '../repositories/usuarios.repository';

export async function crearToken(idUsuario: number): Promise<string> {
  return tokensRepo.crearToken(idUsuario);
}

export async function validarToken(idUsuario: number, codigo: string): Promise<boolean> {
  return tokensRepo.validarToken(idUsuario, codigo);
}

export async function existeCorreo(correo: string): Promise<number | null> {
  return usuariosRepo.obtenerIdPorCorreo(correo);
}
