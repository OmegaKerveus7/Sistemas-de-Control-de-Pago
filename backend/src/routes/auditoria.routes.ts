import { Router } from 'express';
import * as auditoriaController from '../controllers/auditoria.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const auditoriaRouter = Router();

auditoriaRouter.get('/', verificarToken, verificarRol('administrador'), auditoriaController.listar);
