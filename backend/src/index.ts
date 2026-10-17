import './config/env';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { usuariosRouter } from './routes/usuarios.routes';
import { vehiculosRouter } from './routes/vehiculos.routes';
import { parqueoRouter } from './routes/parqueo.routes';
import { pagosRouter } from './routes/pagos.routes';
import { recuperacionRouter } from './routes/recuperacion.routes';
import { guardianRouter } from './routes/guardian.routes';
import { auditoriaRouter } from './routes/auditoria.routes';
import { tarifasRouter } from './routes/tarifas.routes';
import { publicoRouter } from './routes/publico.routes';
import { manejadorErrores } from './middleware/error.middleware';
import { closePool, testConnection } from './config/database';
import { webhook } from './controllers/pagos-online.controller';
import { validarConfiguracionPago } from './services/pasarela.service';
import { reconciliarPendientes } from './services/pagos-online.service';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const origenFrontend = process.env.FRONTEND_BASE_URL ? new URL(process.env.FRONTEND_BASE_URL).origin : 'http://localhost:5173';
const origenesFrontend = [origenFrontend];
const urlFrontend = new URL(origenFrontend);
if (urlFrontend.hostname === 'localhost' || urlFrontend.hostname === '127.0.0.1') {
  urlFrontend.hostname = urlFrontend.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  origenesFrontend.push(urlFrontend.origin);
}
// Solo la API pública de tickets permite llamadas desde aplicaciones externas sin cookies.
app.use('/api/pagos/publico', cors());
app.use('/api/pagos/compartido', cors());
app.use((req, res, next) => {
  if (/^\/api\/pagos\/(publico|compartido)(?:\/|$)/.test(req.path)) { next(); return; }
  cors({ origin: origenesFrontend })(req, res, next);
});
validarConfiguracionPago();
app.post('/api/pagos/webhook/recurrente', express.raw({ type: 'application/json', limit: '256kb' }), webhook);
app.use(express.json());

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({ estado: 'ok', bd: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      estado: 'error',
      bd: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Saludo
app.get('/api/saludo', (_req, res) => {
  res.json({ mensaje: '¡Hola desde la API de parqueo!' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/auth', recuperacionRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/vehiculos', vehiculosRouter);
app.use('/api/parqueo', parqueoRouter);
app.use('/api/pagos', pagosRouter);
app.use('/api/guardian', guardianRouter);
app.use('/api/auditoria', auditoriaRouter);
app.use('/api/tarifas', tarifasRouter);
app.use('/api/publico', publicoRouter);

// Error handler
app.use(manejadorErrores);

// Graceful shutdown
const reconciliacion = setInterval(() => {
  void reconciliarPendientes().catch(() => console.error('[Pagos] Error de reconciliación'));
}, 60000);
reconciliacion.unref();
process.on('SIGINT', async () => {
  clearInterval(reconciliacion);
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  clearInterval(reconciliacion);
  await closePool();
  process.exit(0);
});

app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`[API] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`[API] Health check: http://localhost:${PORT}/api/health`);
});
