import { Router } from 'express';
import * as guardianController from '../controllers/guardian.controller';
import { verificarRol, verificarToken } from '../middleware/auth.middleware';

export const guardianRouter = Router();

guardianRouter.use(verificarToken, verificarRol('guardia', 'administrador'));
guardianRouter.get('/resumen', guardianController.obtenerResumen);
guardianRouter.get('/estadisticas', guardianController.obtenerEstadisticas);
guardianRouter.get('/lugares', guardianController.listarLugares);
guardianRouter.post('/entrada', guardianController.entrada);
guardianRouter.post('/buscar', guardianController.buscar);
guardianRouter.post('/validar-pago', guardianController.validarPago);
guardianRouter.post('/salida', guardianController.salida);
