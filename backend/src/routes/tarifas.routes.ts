import { Router } from 'express';
import * as tarifasController from '../controllers/tarifas.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const tarifasRouter = Router();

tarifasRouter.get('/', verificarToken, tarifasController.listar);
tarifasRouter.get('/:id', verificarToken, tarifasController.obtenerPorId);
tarifasRouter.get('/tipo/:tipo', verificarToken, tarifasController.obtenerPorTipoVehiculo);
tarifasRouter.post('/', verificarToken, verificarRol('admin'), tarifasController.crear);
tarifasRouter.put('/:id', verificarToken, verificarRol('admin'), tarifasController.actualizar);
tarifasRouter.delete('/:id', verificarToken, verificarRol('admin'), tarifasController.eliminar);
