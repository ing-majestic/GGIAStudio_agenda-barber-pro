/**
 * Express server entry point — Agenda Barber Pro
 *
 * Dev:  tsx server/index.ts          (port 3001, vite proxy handles /api)
 * Prod: NODE_ENV=production tsx server/index.ts  (port 5000, serves dist/ + /api)
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { migrate } from './db.js';
import { seedIfEmpty } from './seed.js';
import servicesRouter     from './routes/services.js';
import clientsRouter      from './routes/clients.js';
import appointmentsRouter from './routes/appointments.js';
import blockedTimesRouter from './routes/blocked_times.js';
import settingsRouter     from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = Number(process.env.PORT ?? 3002);
const IS_PROD   = process.env.NODE_ENV === 'production';

// ── Database bootstrap ───────────────────────────────────────────────────
await migrate();
await seedIfEmpty();

// ── Express setup ─────────────────────────────────────────────────────────
const app = express();

app.use(express.json());

// CORS: in dev allow the vite frontend origin; in prod same-origin so no CORS needed
if (!IS_PROD) {
  app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'], credentials: true }));
}

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/services',      servicesRouter);
app.use('/api/clients',       clientsRouter);
app.use('/api/appointments',  appointmentsRouter);
app.use('/api/blocked-times', blockedTimesRouter);
app.use('/api/settings',      settingsRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Serve frontend in production ──────────────────────────────────────────
if (IS_PROD) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  // SPA fallback — any non-API route returns index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'Endpoint not found' });
    } else {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Agenda Barber Pro running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
});
