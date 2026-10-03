import { Router } from 'express';
import * as usuariosController from '../controllers/usuarios.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const usuariosRouter = Router();

// Registro público (sin autenticación)
usuariosRouter.post('/registro', usuariosController.registroPublico);

// Rutas protegidas
usuariosRouter.get('/', verificarToken, verificarRol('administrador'), usuariosController.listar);
usuariosRouter.get('/:id', verificarToken, verificarRol('administrador'), usuariosController.obtenerPorId);
usuariosRouter.post('/', verificarToken, verificarRol('administrador'), usuariosController.crear);
usuariosRouter.put('/:id', verificarToken, verificarRol('administrador'), usuariosController.actualizar);
usuariosRouter.delete('/:id', verificarToken, verificarRol('administrador'), usuariosController.eliminar);
