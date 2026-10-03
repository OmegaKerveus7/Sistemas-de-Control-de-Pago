import { Router } from 'express';
import * as parqueoController from '../controllers/parqueo.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const parqueoRouter = Router();

// Endpoint público: cualquier persona puede consultar el estado de un parqueo con la placa
parqueoRouter.get('/validar/:placa', parqueoController.validarPorPlaca);

// Cualquier usuario autenticado puede consultar el parqueo activo de una placa (lo usa PagarParqueo)
parqueoRouter.get('/placa/:placa', verificarToken, parqueoController.obtenerActivoPorPlaca);

// El resto es reporte administrativo: visibilidad de todas las placas/movimientos
parqueoRouter.get('/', verificarToken, verificarRol('administrador'), parqueoController.listar);
parqueoRouter.get('/:id', verificarToken, verificarRol('administrador'), parqueoController.obtenerPorId);
parqueoRouter.get('/historial/:placa', verificarToken, verificarRol('administrador'), parqueoController.historialPorPlaca);
