import { Router } from 'express';
import * as pagosController from '../controllers/pagos.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const pagosRouter = Router();

// Legacy: pasarela de pago en línea (ver pagos.repository.ts)
pagosRouter.get('/precio', verificarToken, pagosController.precio);
pagosRouter.get('/confirmar', pagosController.confirmar);
pagosRouter.get('/mock-checkout', pagosController.mockCheckout);
pagosRouter.post('/', verificarToken, pagosController.crear);

// Registro y consulta de pagos en efectivo
pagosRouter.post('/efectivo', verificarToken, verificarRol('administrador', 'guardia'), pagosController.registrarEfectivo);
pagosRouter.get('/reporte-mensual', verificarToken, verificarRol('administrador'), pagosController.reporteMensual);
pagosRouter.get('/ticket/:idTicket', verificarToken, verificarRol('administrador', 'guardia'), pagosController.obtenerPorTicket);
pagosRouter.get('/:id', verificarToken, verificarRol('administrador'), pagosController.obtenerPorId);
pagosRouter.get('/', verificarToken, verificarRol('administrador'), pagosController.listar);
