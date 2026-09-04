import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { usuariosRouter } from './routes/usuarios.routes';
import { vehiculosRouter } from './routes/vehiculos.routes';
import { parqueoRouter } from './routes/parqueo.routes';
import { pagosRouter } from './routes/pagos.routes';
import { recuperacionRouter } from './routes/recuperacion.routes';
import { guardianRouter } from './routes/guardian.routes';
import { manejadorErrores } from './middleware/error.middleware';
import { closePool, testConnection } from './config/database';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
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

// Error handler
app.use(manejadorErrores);

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`[API] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`[API] Health check: http://localhost:${PORT}/api/health`);
});
