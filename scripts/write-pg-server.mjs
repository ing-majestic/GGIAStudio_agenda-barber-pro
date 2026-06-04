import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ────────────────────────────────────────────────────────────────────────────
// server/db.ts
// ────────────────────────────────────────────────────────────────────────────
writeFileSync(join(root, 'server', 'db.ts'), `/**
 * Database: PostgreSQL via postgres.js
 * On Replit: DATABASE_URL is injected automatically from the Replit Postgres addon.
 * Locally: set DATABASE_URL in .env (e.g. postgres://user:pass@localhost:5432/barber)
 * shopId column on every table ensures multi-tenant upgrade is non-breaking.
 */
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export async function migrate(): Promise<void> {
  await sql\`
    CREATE TABLE IF NOT EXISTS services (
      id          TEXT PRIMARY KEY,
      shop_id     TEXT NOT NULL DEFAULT 'shop1',
      name        TEXT NOT NULL,
      duration    INTEGER NOT NULL,
      price       NUMERIC NOT NULL,
      buffer      INTEGER NOT NULL DEFAULT 5,
      color       TEXT NOT NULL DEFAULT '#C89B3C'
    )
  \`;

  await sql\`
    CREATE TABLE IF NOT EXISTS clients (
      id            TEXT PRIMARY KEY,
      shop_id       TEXT NOT NULL DEFAULT 'shop1',
      name          TEXT NOT NULL,
      phone         TEXT NOT NULL,
      notes         TEXT NOT NULL DEFAULT '',
      no_show_count INTEGER NOT NULL DEFAULT 0,
      is_frequent   BOOLEAN NOT NULL DEFAULT FALSE
    )
  \`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)\`;

  await sql\`
    CREATE TABLE IF NOT EXISTS appointments (
      id            TEXT PRIMARY KEY,
      shop_id       TEXT NOT NULL DEFAULT 'shop1',
      client_id     TEXT NOT NULL,
      client_name   TEXT NOT NULL,
      client_phone  TEXT NOT NULL,
      service_id    TEXT NOT NULL,
      service_name  TEXT NOT NULL,
      date          TEXT NOT NULL,
      start_time    TEXT NOT NULL,
      end_time      TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'Confirmada',
      notes         TEXT NOT NULL DEFAULT '',
      price         NUMERIC NOT NULL DEFAULT 0,
      duration      INTEGER NOT NULL DEFAULT 30,
      is_overbooked BOOLEAN NOT NULL DEFAULT FALSE
    )
  \`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(date)\`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_appointments_shop   ON appointments(shop_id, date)\`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id)\`;

  await sql\`
    CREATE TABLE IF NOT EXISTS blocked_times (
      id         TEXT PRIMARY KEY,
      shop_id    TEXT NOT NULL DEFAULT 'shop1',
      label      TEXT NOT NULL,
      date       TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time   TEXT NOT NULL
    )
  \`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_times(date)\`;

  await sql\`
    CREATE TABLE IF NOT EXISTS settings (
      shop_id             TEXT PRIMARY KEY DEFAULT 'shop1',
      business_name       TEXT NOT NULL DEFAULT 'Agenda Barber Pro',
      open_time           TEXT NOT NULL DEFAULT '12:00',
      close_time          TEXT NOT NULL DEFAULT '23:00',
      working_days        TEXT NOT NULL DEFAULT '[0,2,3,4,5,6]',
      default_buffer      INTEGER NOT NULL DEFAULT 5,
      whatsapp_templates  TEXT NOT NULL DEFAULT '{}'
    )
  \`;
}
`, 'utf8');

// ────────────────────────────────────────────────────────────────────────────
// server/seed.ts
// ────────────────────────────────────────────────────────────────────────────
writeFileSync(join(root, 'server', 'seed.ts'), `/**
 * Seed initial demo data if the database is empty.
 * Uses today's real date so appointments are always relevant.
 */
import { sql } from './db.js';

const SHOP_ID = 'shop1';

const DEFAULT_TEMPLATES = JSON.stringify({
  availability:  "¡Hola {cliente}! 💈 Aquí tienes mis horarios disponibles para el {fecha} ({servicio}):  {horarios}  ¿Cuál te queda mejor?",
  confirmation:  "¡Listo {cliente}! 🔥 Cita confirmada para el {fecha} a las {hora}. Servicio: {servicio}. ¡Te espero puntualmente! 💈",
  reschedule:    "Hola {cliente} 👋 Hemos movido tu cita para el {fecha} a las {hora}. ¿Todo en orden? ¡Nos vemos!",
  cancellation:  "Hola {cliente}. Tu cita del {fecha} a las {hora} ha sido cancelada. Si deseas reagendar, avísame. Saludos 💈",
  reminder:      "Qué tal {cliente} 👋 Te recuerdo tu cita de hoy a las {hora} para {servicio}. ¡Nos vemos en un rato! 💈"
});

function toDateStr(d: Date): string {
  return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
}

export async function seedIfEmpty(): Promise<void> {
  const [{ count }] = await sql<[{ count: string }]>\`
    SELECT COUNT(*)::text AS count FROM services WHERE shop_id = \${SHOP_ID}
  \`;
  if (Number(count) > 0) return;

  console.log('[seed] Populating initial demo data ...');

  const today    = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(Date.now() + 86_400_000));

  // Settings
  await sql\`
    INSERT INTO settings (shop_id, business_name, open_time, close_time, working_days, default_buffer, whatsapp_templates)
    VALUES (\${SHOP_ID}, 'Barber Studio Pro', '12:00', '23:00', '[0,2,3,4,5,6]', 5, \${DEFAULT_TEMPLATES})
    ON CONFLICT (shop_id) DO NOTHING
  \`;

  // Services
  const services = [
    { id: 'srv_001', name: 'Corte Clásico',           duration: 30, price: 180, buffer: 5, color: '#C89B3C' },
    { id: 'srv_002', name: 'Corte y Barba Premium',    duration: 60, price: 350, buffer: 10, color: '#8B5CF6' },
    { id: 'srv_003', name: 'Perfilado de Barba',       duration: 30, price: 120, buffer: 5, color: '#3B82F6' },
    { id: 'srv_004', name: 'Camuflaje de Canas',       duration: 45, price: 250, buffer: 10, color: '#10B981' },
    { id: 'srv_005', name: 'Ritual de Toalla Caliente',duration: 20, price: 80,  buffer: 0, color: '#F59E0B' },
  ];
  for (const s of services) {
    await sql\`
      INSERT INTO services (id, shop_id, name, duration, price, buffer, color)
      VALUES (\${s.id}, \${SHOP_ID}, \${s.name}, \${s.duration}, \${s.price}, \${s.buffer}, \${s.color})
      ON CONFLICT (id) DO NOTHING
    \`;
  }

  // Clients
  const clients = [
    { id: 'cli_001', name: 'Carlos Mendoza',   phone: '55 1234-5678', notes: 'Prefiere sin máquina en nuca', noShow: 0, freq: true  },
    { id: 'cli_002', name: 'Ernesto Vargas',   phone: '55 9876-5432', notes: '',                             noShow: 1, freq: false },
    { id: 'cli_003', name: 'Miguel Ángel Ruiz',phone: '55 5555-0101', notes: 'Cliente VIP, trato especial',  noShow: 0, freq: true  },
    { id: 'cli_004', name: 'Roberto Sánchez',  phone: '55 4444-2222', notes: '',                             noShow: 0, freq: false },
    { id: 'cli_005', name: 'David Castillo',   phone: '55 3333-9999', notes: 'Alérgico a ciertos productos', noShow: 2, freq: false },
  ];
  for (const c of clients) {
    await sql\`
      INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
      VALUES (\${c.id}, \${SHOP_ID}, \${c.name}, \${c.phone}, \${c.notes}, \${c.noShow}, \${c.freq})
      ON CONFLICT (id) DO NOTHING
    \`;
  }

  // Appointments (today and tomorrow)
  const appointments = [
    { id: 'apt_001', clientId: 'cli_001', clientName: 'Carlos Mendoza',    clientPhone: '55 1234-5678', serviceId: 'srv_001', serviceName: 'Corte Clásico',         date: today,    start: '14:00', end: '14:30', price: 180, dur: 30, status: 'Confirmada' },
    { id: 'apt_002', clientId: 'cli_002', clientName: 'Ernesto Vargas',    clientPhone: '55 9876-5432', serviceId: 'srv_002', serviceName: 'Corte y Barba Premium', date: today,    start: '15:00', end: '16:00', price: 350, dur: 60, status: 'Confirmada' },
    { id: 'apt_003', clientId: 'cli_003', clientName: 'Miguel Ángel Ruiz', clientPhone: '55 5555-0101', serviceId: 'srv_003', serviceName: 'Perfilado de Barba',    date: today,    start: '17:00', end: '17:30', price: 120, dur: 30, status: 'Pendiente'  },
    { id: 'apt_004', clientId: 'cli_004', clientName: 'Roberto Sánchez',   clientPhone: '55 4444-2222', serviceId: 'srv_001', serviceName: 'Corte Clásico',         date: today,    start: '18:00', end: '18:30', price: 180, dur: 30, status: 'Confirmada' },
    { id: 'apt_005', clientId: 'cli_005', clientName: 'David Castillo',    clientPhone: '55 3333-9999', serviceId: 'srv_004', serviceName: 'Camuflaje de Canas',    date: tomorrow, start: '14:00', end: '14:45', price: 250, dur: 45, status: 'Confirmada' },
    { id: 'apt_006', clientId: 'cli_001', clientName: 'Carlos Mendoza',    clientPhone: '55 1234-5678', serviceId: 'srv_005', serviceName: 'Ritual de Toalla Caliente', date: tomorrow, start: '15:30', end: '15:50', price: 80, dur: 20, status: 'Confirmada' },
  ];
  for (const a of appointments) {
    await sql\`
      INSERT INTO appointments
        (id, shop_id, client_id, client_name, client_phone, service_id, service_name,
         date, start_time, end_time, status, notes, price, duration, is_overbooked)
      VALUES
        (\${a.id}, \${SHOP_ID}, \${a.clientId}, \${a.clientName}, \${a.clientPhone},
         \${a.serviceId}, \${a.serviceName}, \${a.date}, \${a.start}, \${a.end},
         \${a.status}, '', \${a.price}, \${a.dur}, FALSE)
      ON CONFLICT (id) DO NOTHING
    \`;
  }

  // Blocked times
  await sql\`
    INSERT INTO blocked_times (id, shop_id, label, date, start_time, end_time)
    VALUES ('blk_001', \${SHOP_ID}, 'Comida', \${today}, '13:00', '14:00')
    ON CONFLICT (id) DO NOTHING
  \`;
  await sql\`
    INSERT INTO blocked_times (id, shop_id, label, date, start_time, end_time)
    VALUES ('blk_002', \${SHOP_ID}, 'Descanso tarde', \${tomorrow}, '16:30', '17:00')
    ON CONFLICT (id) DO NOTHING
  \`;

  console.log(\`[seed] Done — seeded for today=\${today}, tomorrow=\${tomorrow}\`);
}
`, 'utf8');

// ────────────────────────────────────────────────────────────────────────────
// server/routes/services.ts
// ────────────────────────────────────────────────────────────────────────────
writeFileSync(join(root, 'server', 'routes', 'services.ts'), `import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/services
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await sql\`SELECT * FROM services WHERE shop_id = \${SHOP_ID} ORDER BY name\`;
    res.json(rows);
  } catch (err) {
    console.error('[services] GET error:', err);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// POST /api/services
router.post('/', async (req: Request, res: Response) => {
  const { name, duration, price, buffer, color } = req.body as Record<string, unknown>;
  if (!name || !duration || price === undefined) {
    res.status(400).json({ error: 'name, duration y price son requeridos' });
    return;
  }
  const id = \`srv_\${Date.now()}\`;
  try {
    const [row] = await sql\`
      INSERT INTO services (id, shop_id, name, duration, price, buffer, color)
      VALUES (\${id}, \${SHOP_ID}, \${String(name)}, \${Number(duration)}, \${Number(price)}, \${Number(buffer ?? 5)}, \${String(color ?? '#C89B3C')})
      RETURNING *
    \`;
    res.status(201).json(row);
  } catch (err) {
    console.error('[services] POST error:', err);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// PUT /api/services/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { name, duration, price, buffer, color } = req.body as Record<string, unknown>;
  const { id } = req.params;
  try {
    const [existing] = await sql\`SELECT * FROM services WHERE id = \${id} AND shop_id = \${SHOP_ID}\`;
    if (!existing) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }
    const [row] = await sql\`
      UPDATE services SET
        name     = \${name     ?? existing.name},
        duration = \${Number(duration ?? existing.duration)},
        price    = \${Number(price    ?? existing.price)},
        buffer   = \${Number(buffer   ?? existing.buffer)},
        color    = \${color    ?? existing.color}
      WHERE id = \${id} AND shop_id = \${SHOP_ID}
      RETURNING *
    \`;
    res.json(row);
  } catch (err) {
    console.error('[services] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

// DELETE /api/services/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await sql\`DELETE FROM services WHERE id = \${id} AND shop_id = \${SHOP_ID} RETURNING id\`;
    if (result.length === 0) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[services] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

export default router;
`, 'utf8');

// ────────────────────────────────────────────────────────────────────────────
// server/routes/clients.ts
// ────────────────────────────────────────────────────────────────────────────
writeFileSync(join(root, 'server', 'routes', 'clients.ts'), `import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

function normalize(c: Record<string, unknown>) {
  return { ...c, noShowCount: c.no_show_count, isFrequent: Boolean(c.is_frequent) };
}

// GET /api/clients
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await sql\`SELECT * FROM clients WHERE shop_id = \${SHOP_ID} ORDER BY name\`;
    res.json((rows as Record<string, unknown>[]).map(normalize));
  } catch (err) {
    console.error('[clients] GET error:', err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// POST /api/clients
router.post('/', async (req: Request, res: Response) => {
  const { name, phone, notes, noShowCount, isFrequent } = req.body as Record<string, unknown>;
  if (!name || !phone) {
    res.status(400).json({ error: 'name y phone son requeridos' });
    return;
  }
  const id = \`cli_\${Date.now()}\`;
  try {
    const [row] = await sql\`
      INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
      VALUES (\${id}, \${SHOP_ID}, \${String(name)}, \${String(phone)}, \${String(notes ?? '')}, \${Number(noShowCount ?? 0)}, \${Boolean(isFrequent)})
      RETURNING *
    \`;
    res.status(201).json(normalize(row as Record<string, unknown>));
  } catch (err) {
    console.error('[clients] POST error:', err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, notes, noShowCount, isFrequent } = req.body as Record<string, unknown>;
  try {
    const [existing] = await sql\`SELECT * FROM clients WHERE id = \${id} AND shop_id = \${SHOP_ID}\`;
    if (!existing) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    const e = existing as Record<string, unknown>;
    const [row] = await sql\`
      UPDATE clients SET
        name          = \${name  ?? e.name},
        phone         = \${phone ?? e.phone},
        notes         = \${notes ?? e.notes},
        no_show_count = \${Number(noShowCount ?? e.no_show_count)},
        is_frequent   = \${isFrequent !== undefined ? Boolean(isFrequent) : Boolean(e.is_frequent)}
      WHERE id = \${id} AND shop_id = \${SHOP_ID}
      RETURNING *
    \`;
    res.json(normalize(row as Record<string, unknown>));
  } catch (err) {
    console.error('[clients] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await sql\`DELETE FROM clients WHERE id = \${id} AND shop_id = \${SHOP_ID} RETURNING id\`;
    if (result.length === 0) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[clients] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
`, 'utf8');

// ────────────────────────────────────────────────────────────────────────────
// server/routes/blocked_times.ts
// ────────────────────────────────────────────────────────────────────────────
writeFileSync(join(root, 'server', 'routes', 'blocked_times.ts'), `import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/blocked-times?date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query as Record<string, string>;
    const rows = date
      ? await sql\`SELECT * FROM blocked_times WHERE shop_id = \${SHOP_ID} AND date = \${date} ORDER BY start_time\`
      : await sql\`SELECT * FROM blocked_times WHERE shop_id = \${SHOP_ID} ORDER BY date, start_time\`;
    res.json(rows);
  } catch (err) {
    console.error('[blocked_times] GET error:', err);
    res.status(500).json({ error: 'Error al obtener bloqueos' });
  }
});

// POST /api/blocked-times
router.post('/', async (req: Request, res: Response) => {
  const { label, date, startTime, endTime } = req.body as Record<string, unknown>;
  if (!label || !date || !startTime || !endTime) {
    res.status(400).json({ error: 'label, date, startTime y endTime son requeridos' });
    return;
  }
  const id = \`blk_\${Date.now()}\`;
  try {
    const [row] = await sql\`
      INSERT INTO blocked_times (id, shop_id, label, date, start_time, end_time)
      VALUES (\${id}, \${SHOP_ID}, \${String(label)}, \${String(date)}, \${String(startTime)}, \${String(endTime)})
      RETURNING *
    \`;
    res.status(201).json(row);
  } catch (err) {
    console.error('[blocked_times] POST error:', err);
    res.status(500).json({ error: 'Error al crear bloqueo' });
  }
});

// DELETE /api/blocked-times/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await sql\`DELETE FROM blocked_times WHERE id = \${id} AND shop_id = \${SHOP_ID} RETURNING id\`;
    if (result.length === 0) { res.status(404).json({ error: 'Bloqueo no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[blocked_times] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar bloqueo' });
  }
});

export default router;
`, 'utf8');

// ────────────────────────────────────────────────────────────────────────────
// server/routes/settings.ts
// ────────────────────────────────────────────────────────────────────────────
writeFileSync(join(root, 'server', 'routes', 'settings.ts'), `import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [row] = await sql\`SELECT * FROM settings WHERE shop_id = \${SHOP_ID}\`;
    if (!row) { res.status(404).json({ error: 'Configuración no encontrada' }); return; }
    const r = row as Record<string, unknown>;
    res.json({
      businessName:      r.business_name,
      openTime:          r.open_time,
      closeTime:         r.close_time,
      workingDays:       JSON.parse(String(r.working_days)),
      defaultBuffer:     r.default_buffer,
      whatsappTemplates: JSON.parse(String(r.whatsapp_templates))
    });
  } catch (err) {
    console.error('[settings] GET error:', err);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
  const { businessName, openTime, closeTime, workingDays, defaultBuffer, whatsappTemplates } = req.body as Record<string, unknown>;
  try {
    await sql\`
      INSERT INTO settings (shop_id, business_name, open_time, close_time, working_days, default_buffer, whatsapp_templates)
      VALUES (
        \${SHOP_ID},
        \${String(businessName ?? 'Agenda Barber Pro')},
        \${String(openTime     ?? '12:00')},
        \${String(closeTime    ?? '23:00')},
        \${JSON.stringify(workingDays ?? [0,2,3,4,5,6])},
        \${Number(defaultBuffer ?? 5)},
        \${JSON.stringify(whatsappTemplates ?? {})}
      )
      ON CONFLICT (shop_id) DO UPDATE SET
        business_name      = EXCLUDED.business_name,
        open_time          = EXCLUDED.open_time,
        close_time         = EXCLUDED.close_time,
        working_days       = EXCLUDED.working_days,
        default_buffer     = EXCLUDED.default_buffer,
        whatsapp_templates = EXCLUDED.whatsapp_templates
    \`;
    const [row] = await sql\`SELECT * FROM settings WHERE shop_id = \${SHOP_ID}\`;
    const r = row as Record<string, unknown>;
    res.json({
      businessName:      r.business_name,
      openTime:          r.open_time,
      closeTime:         r.close_time,
      workingDays:       JSON.parse(String(r.working_days)),
      defaultBuffer:     r.default_buffer,
      whatsappTemplates: JSON.parse(String(r.whatsapp_templates))
    });
  } catch (err) {
    console.error('[settings] PUT error:', err);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

export default router;
`, 'utf8');

console.log('All server files written successfully');
