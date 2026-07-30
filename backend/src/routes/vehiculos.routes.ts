import { Router } from 'express';
import * as vehiculosController from '../controllers/vehiculos.controller';
import { verificarToken } from '../middleware/auth.middleware';

export const vehiculosRouter = Router();

vehiculosRouter.get('/', verificarToken, vehiculosController.listar);
vehiculosRouter.get('/:id', verificarToken, vehiculosController.obtenerPorId);
vehiculosRouter.get('/placa/:placa', verificarToken, vehiculosController.obtenerPorPlaca);
vehiculosRouter.post('/', verificarToken, vehiculosController.crear);
vehiculosRouter.put('/:id', verificarToken, vehiculosController.actualizar);
vehiculosRouter.delete('/:id', verificarToken, vehiculosController.eliminar);
