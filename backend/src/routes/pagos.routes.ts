import { Router } from 'express';
import * as pagosController from '../controllers/pagos.controller';
import { verificarToken } from '../middleware/auth.middleware';

export const pagosRouter = Router();

pagosRouter.get('/', verificarToken, pagosController.listar);
pagosRouter.get('/:id', verificarToken, pagosController.obtenerPorId);
pagosRouter.get('/parqueo/:parqueoId', verificarToken, pagosController.obtenerPorParqueo);
pagosRouter.post('/', verificarToken, pagosController.crear);
