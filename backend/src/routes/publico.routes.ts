import { Router } from 'express';
import * as pagos from '../controllers/pagos-publico.controller';
import { limitarPeticiones } from '../middleware/rate-limit.middleware';

export const publicoRouter = Router();

// Sin sesión: el pago por QR lo hace cualquier persona. Los límites por IP protegen el cobro y el catálogo de placas;
// son holgados porque varias personas pueden compartir IP (wifi del colegio, datos móviles).
publicoRouter.get('/pago/placa/:placa', limitarPeticiones('consulta', 40, 60_000), pagos.consultar);
publicoRouter.post('/pago', limitarPeticiones('crear', 20, 10 * 60_000), pagos.crear);
publicoRouter.get('/pago/:referencia', limitarPeticiones('confirmar', 120, 60_000), pagos.confirmar);
publicoRouter.post('/pago/:referencia/simular', limitarPeticiones('simular', 30, 60_000), pagos.simular);
