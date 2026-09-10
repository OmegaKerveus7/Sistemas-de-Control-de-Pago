import { Router } from 'express';
import * as tarifasController from '../controllers/tarifas.controller';
import { verificarToken, verificarRol } from '../middleware/auth.middleware';

export const tarifasRouter = Router();

tarifasRouter.use(verificarToken, verificarRol('administrador'));
tarifasRouter.get('/', tarifasController.listar);
tarifasRouter.get('/:id', tarifasController.obtenerPorId);
tarifasRouter.post('/', tarifasController.crear);
tarifasRouter.put('/:id', tarifasController.actualizar);
