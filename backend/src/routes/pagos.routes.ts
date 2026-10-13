import { Router } from 'express';
import * as pagosController from '../controllers/pagos.controller';
import * as online from '../controllers/pagos-online.controller';
import * as publico from '../controllers/pagos-publico.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const pagosRouter = Router();

pagosRouter.get('/compartido/:referencia', online.confirmarCompartido);
pagosRouter.post('/publico/precio', online.precioPublico);
pagosRouter.post('/publico', online.crearPublico);

pagosRouter.get('/precio', verificarToken, online.precio);
pagosRouter.post('/', verificarToken, online.crear);
pagosRouter.get('/confirmar/:referencia', verificarToken, online.confirmar);
pagosRouter.post('/simular/:referencia', verificarToken, online.simular);

pagosRouter.get('/mis-pagos', verificarToken, pagosController.misPagos);
pagosRouter.get('/permiso/:placa', verificarToken, verificarRol('administrador', 'cobrador', 'guardia'), publico.permisoDePlaca);
pagosRouter.get('/estado-hoy', verificarToken, verificarRol('administrador', 'cobrador', 'guardia'), publico.estadoHoy);
pagosRouter.post('/efectivo', verificarToken, verificarRol('administrador', 'cobrador', 'guardia'), pagosController.registrarEfectivo);
pagosRouter.post('/recordatorios', verificarToken, verificarRol('administrador', 'cobrador', 'guardia'), pagosController.enviarRecordatorios);
pagosRouter.get('/reporte-mensual', verificarToken, verificarRol('administrador'), pagosController.reporteMensual);
pagosRouter.get('/reporte-detallado', verificarToken, verificarRol('administrador'), pagosController.reporteDetallado);
pagosRouter.get('/ticket/:idTicket', verificarToken, verificarRol('administrador', 'cobrador', 'guardia'), pagosController.obtenerPorTicket);
pagosRouter.get('/:id', verificarToken, verificarRol('administrador'), pagosController.obtenerPorId);
pagosRouter.get('/', verificarToken, verificarRol('administrador'), pagosController.listar);
