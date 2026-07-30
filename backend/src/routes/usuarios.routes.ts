import { Router } from 'express';
import * as usuariosController from '../controllers/usuarios.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const usuariosRouter = Router();

usuariosRouter.get('/', verificarToken, usuariosController.listar);
usuariosRouter.get('/:id', verificarToken, usuariosController.obtenerPorId);
usuariosRouter.post('/', verificarToken, verificarRol('admin'), usuariosController.crear);
usuariosRouter.put('/:id', verificarToken, verificarRol('admin'), usuariosController.actualizar);
usuariosRouter.delete('/:id', verificarToken, verificarRol('admin'), usuariosController.eliminar);
