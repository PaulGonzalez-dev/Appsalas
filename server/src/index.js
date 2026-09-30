import './tz.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import salasRoutes from './routes/salas.js';
import reservasRoutes from './routes/reservas.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/salud', (_req, res) => {
  res.json({ ok: true, servicio: 'appsalas-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/salas', salasRoutes);
app.use('/', reservasRoutes);

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
