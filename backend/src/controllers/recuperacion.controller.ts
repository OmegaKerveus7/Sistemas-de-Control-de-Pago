import type { Request, Response } from 'express';
import * as tokenService from '../services/token.service';
import * as correoService from '../services/correo.service';
import * as usuariosService from '../services/usuarios.service';

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const correo = email || req.body.correo;

  if (!correo) {
    res.status(400).json({ error: 'El correo es requerido' });
    return;
  }

  const idUsuario = await tokenService.existeCorreo(correo);
  if (idUsuario === null) {
    res.status(404).json({ error: 'No existe una cuenta con ese correo electrónico' });
    return;
  }

  const usuario = await usuariosService.obtenerPorId(idUsuario);
  if (!usuario) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const codigo = await tokenService.crearToken(idUsuario);

  try {
    await correoService.enviarCodigoVerificacion(
      correo,
      codigo,
      `${usuario.nombres} ${usuario.apellidos}`,
    );
    res.json({ mensaje: 'Código de verificación enviado a tu correo', id_usuario: idUsuario });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al enviar correo';
    res.status(500).json({ error: `No se pudo enviar el correo: ${msg}` });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { id_usuario, codigo, nueva_contraseña, nueva_password } = req.body;
  const password = nueva_password || nueva_contraseña;

  if (!id_usuario || !codigo || !password) {
    res.status(400).json({ error: 'Se requieren: id_usuario, código y nueva contraseña' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    return;
  }

  const valido = await tokenService.validarToken(id_usuario, codigo);
  if (!valido) {
    res.status(400).json({ error: 'Código inválido o expirado' });
    return;
  }

  const ok = await usuariosService.actualizar(id_usuario, { pass: password });
  if (!ok) {
    res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
    return;
  }

  res.json({ mensaje: 'Contraseña actualizada exitosamente' });
}
