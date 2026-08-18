import { Router } from 'express';
import * as usuariosController from '../controllers/usuarios.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const usuariosRouter = Router();

usuariosRouter.get('/', verificarToken, usuariosController.listar);
usuariosRouter.get('/:id', verificarToken, usuariosController.obtenerPorId);
usuariosRouter.post('/', verificarToken, verificarRol('ADMIN'), usuariosController.crear);
usuariosRouter.put('/:id', verificarToken, verificarRol('ADMIN'), usuariosController.actualizar);
usuariosRouter.delete('/:id', verificarToken, verificarRol('ADMIN'), usuariosController.eliminar);
