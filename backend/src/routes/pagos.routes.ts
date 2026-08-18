import { Router } from 'express';
import * as pagosController from '../controllers/pagos.controller';
import { verificarToken } from '../middleware/auth.middleware';

export const pagosRouter = Router();

pagosRouter.get('/reporte-mensual', verificarToken, pagosController.reporteMensual);
pagosRouter.get('/precio', verificarToken, pagosController.precio);
pagosRouter.get('/confirmar', pagosController.confirmar);
pagosRouter.get('/mock-checkout', pagosController.mockCheckout);
pagosRouter.get('/parqueo/:parqueoId', verificarToken, pagosController.obtenerPorParqueo);
pagosRouter.get('/:id', verificarToken, pagosController.obtenerPorId);
pagosRouter.get('/', verificarToken, pagosController.listar);
pagosRouter.post('/', verificarToken, pagosController.crear);