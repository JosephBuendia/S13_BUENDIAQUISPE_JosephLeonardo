// Arma la aplicación Express: middlewares globales -> rutas -> 404 -> manejador de errores.
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler, noEncontrada } from './middlewares/errorHandler.js';
import { asyncHandler } from './utils/asyncHandler.js';

const app = express();
app.set('trust proxy', 1); // detrás del proxy de Render, req.ip es la IP real del visitante
app.disable('x-powered-by');

// CORS: solo las URLs del frontend listadas en CORS_ORIGINS (vacío = cualquiera, solo para desarrollo).
app.use(cors({
  origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });
app.use(express.json({ limit: '50kb' }));

app.get('/', (req, res) => res.json({ servicio: 'API Serenazgo Alerta Huancayo', salud: '/api/salud' }));

// Verifica también la conexión con Neon (sirve para Render y para la demostración).
app.get('/api/salud', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, bd: 'conectada' });
}));

app.use('/api', routes);

app.use(noEncontrada);
app.use(errorHandler);

export default app;
