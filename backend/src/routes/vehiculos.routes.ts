import { Router } from 'express';
import * as vehiculosController from '../controllers/vehiculos.controller';
import { verificarToken } from '../middleware/auth.middleware';

export const vehiculosRouter = Router();

vehiculosRouter.get('/', verificarToken, vehiculosController.listar);
vehiculosRouter.get('/buscar', verificarToken, vehiculosController.buscar);
vehiculosRouter.get('/:id', verificarToken, vehiculosController.obtenerPorId);
vehiculosRouter.get('/placa/:placa', verificarToken, vehiculosController.obtenerPorPlaca);
vehiculosRouter.get('/usuario/:idUsuario', verificarToken, vehiculosController.vehiculosPorUsuario);
vehiculosRouter.post('/', verificarToken, vehiculosController.crear);
vehiculosRouter.post('/asignar', verificarToken, vehiculosController.asignarAUsuario);
vehiculosRouter.put('/:id', verificarToken, vehiculosController.actualizar);
vehiculosRouter.delete('/:id', verificarToken, vehiculosController.eliminar);
vehiculosRouter.delete('/usuario/:idUsuario/:idVehiculo', verificarToken, vehiculosController.removerDeUsuario);
