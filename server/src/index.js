import './tz.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import salasRoutes from './routes/salas.js';
import reservasRoutes from './routes/reservas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/salud', (_req, res) => {
  res.json({ ok: true, servicio: 'appsalas-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/salas', salasRoutes);
app.use('/', reservasRoutes);

// En producción (deploy) Express sirve el build del frontend y resuelve el SPA.
const distDir = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message,
  });
});

const PUERTO = Number(process.env.PORT) || 3001;
app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`✅ API de AppSalas escuchando en http://localhost:${PUERTO}`);
});
