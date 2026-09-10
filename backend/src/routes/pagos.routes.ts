import { Router } from 'express';
import * as pagosController from '../controllers/pagos.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const pagosRouter = Router();

pagosRouter.get('/mis-pagos', verificarToken, pagosController.misPagos);
pagosRouter.post('/efectivo', verificarToken, verificarRol('administrador', 'guardia'), pagosController.registrarEfectivo);
pagosRouter.get('/reporte-mensual', verificarToken, verificarRol('administrador'), pagosController.reporteMensual);
pagosRouter.get('/ticket/:idTicket', verificarToken, verificarRol('administrador', 'guardia'), pagosController.obtenerPorTicket);
pagosRouter.get('/:id', verificarToken, verificarRol('administrador'), pagosController.obtenerPorId);
pagosRouter.get('/', verificarToken, verificarRol('administrador'), pagosController.listar);
