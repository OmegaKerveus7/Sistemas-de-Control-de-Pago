import { Router } from 'express';
import * as parqueoController from '../controllers/parqueo.controller';
import { verificarToken } from '../middleware/auth.middleware';

export const parqueoRouter = Router();

parqueoRouter.get('/', verificarToken, parqueoController.listar);
parqueoRouter.get('/:id', verificarToken, parqueoController.obtenerPorId);
parqueoRouter.get('/placa/:placa', verificarToken, parqueoController.obtenerActivoPorPlaca);
parqueoRouter.post('/entrada', verificarToken, parqueoController.registrarEntrada);
parqueoRouter.put('/:id/salida', verificarToken, parqueoController.registrarSalida);
parqueoRouter.put('/:id/cancelar', verificarToken, parqueoController.cancelar);
