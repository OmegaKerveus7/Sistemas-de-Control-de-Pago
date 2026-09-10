import { Router } from 'express';
import * as vehiculosController from '../controllers/vehiculos.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const vehiculosRouter = Router();

const soloPersonal = verificarRol('administrador', 'guardia');

vehiculosRouter.get('/', verificarToken, soloPersonal, vehiculosController.listar);
vehiculosRouter.get('/buscar', verificarToken, soloPersonal, vehiculosController.buscar);
vehiculosRouter.get('/:id', verificarToken, soloPersonal, vehiculosController.obtenerPorId);
vehiculosRouter.get('/placa/:placa', verificarToken, soloPersonal, vehiculosController.obtenerPorPlaca);
vehiculosRouter.get('/usuario/:idUsuario', verificarToken, vehiculosController.vehiculosPorUsuario);
vehiculosRouter.post('/', verificarToken, vehiculosController.crear);
vehiculosRouter.post('/asignar', verificarToken, vehiculosController.asignarAUsuario);
vehiculosRouter.put('/:id', verificarToken, vehiculosController.actualizar);
vehiculosRouter.delete('/:id', verificarToken, vehiculosController.eliminar);
vehiculosRouter.delete('/usuario/:idUsuario/:idVehiculo', verificarToken, vehiculosController.removerDeUsuario);
