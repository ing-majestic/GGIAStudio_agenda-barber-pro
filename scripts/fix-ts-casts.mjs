import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Fix appointments.ts - explicit casts for all req.body unknown values
writeFileSync(join(root, 'server', 'routes', 'appointments.ts'), `/**
 * Appointments routes: full CRUD + backend validations
 * - 422 OUTSIDE_HOURS / CLOSED_DAY: outside business hours or closed day
 * - 409 COLLISION: overlap with another appointment or blocked time
 * - isOverbooked=true bypasses collision check (explicit user decision)
 */
import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

type CollisionItem = { type: 'appointment' | 'blocked'; label: string };

async function findCollisions(
  shopId: string,
  date: string,
  startTime: string,
  duration: number,
  excludeId?: string
): Promise<CollisionItem[]> {
  const startMin = parseTime(startTime);
  const endMin   = startMin + duration;
  const collisions: CollisionItem[] = [];

  const appointments = excludeId
    ? await sql\`
        SELECT a.*, s.buffer FROM appointments a
        LEFT JOIN services s ON a.service_id = s.id
        WHERE a.shop_id = \${shopId} AND a.date = \${date}
          AND a.status != 'Cancelada' AND a.id != \${excludeId}
      \`
    : await sql\`
        SELECT a.*, s.buffer FROM appointments a
        LEFT JOIN services s ON a.service_id = s.id
        WHERE a.shop_id = \${shopId} AND a.date = \${date} AND a.status != 'Cancelada'
      \`;

  for (const appt of appointments as Record<string, unknown>[]) {
    const aStart  = parseTime(String(appt.start_time));
    const aEnd    = parseTime(String(appt.end_time));
    const buffer  = Number(appt.buffer ?? 5);
    if (startMin < aEnd + buffer && endMin > aStart) {
      collisions.push({
        type:  'appointment',
        label: appt.client_name + ' (' + appt.start_time + '-' + appt.end_time + ' +' + buffer + 'm buffer)'
      });
    }
  }

  const blocks = await sql\`SELECT * FROM blocked_times WHERE shop_id = \${shopId} AND date = \${date}\`;
  for (const blk of blocks as Record<string, unknown>[]) {
    const bStart = parseTime(String(blk.start_time));
    const bEnd   = parseTime(String(blk.end_time));
    if (startMin < bEnd && endMin > bStart) {
      collisions.push({ type: 'blocked', label: 'Bloqueo: ' + blk.label + ' (' + blk.start_time + '-' + blk.end_time + ')' });
    }
  }

  return collisions;
}

type HoursViolation = { error: string; code: 'OUTSIDE_HOURS' | 'CLOSED_DAY' } | null;

async function validateHours(shopId: string, date: string, startTime: string, duration: number): Promise<HoursViolation> {
  const [settings] = await sql\`SELECT * FROM settings WHERE shop_id = \${shopId}\`;
  if (!settings) return null;
  const s = settings as Record<string, unknown>;
  const workingDays: number[] = JSON.parse(String(s.working_days));
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  if (!workingDays.includes(dayOfWeek)) return { error: 'El ' + date + ' es dia cerrado', code: 'CLOSED_DAY' };
  const openMin  = parseTime(String(s.open_time));
  const closeMin = parseTime(String(s.close_time));
  const startMin = parseTime(startTime);
  const endMin   = startMin + duration;
  if (startMin < openMin)  return { error: 'La hora ' + startTime + ' es antes de apertura (' + s.open_time + ')', code: 'OUTSIDE_HOURS' };
  if (endMin   > closeMin) return { error: 'La cita terminaria a las ' + formatTime(endMin) + ', despues de cierre (' + s.close_time + ')', code: 'OUTSIDE_HOURS' };
  return null;
}

// GET /api/appointments?date=YYYY-MM-DD&status=Confirmada
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, status } = req.query as Record<string, string>;
    const rows = date && status
      ? await sql\`SELECT * FROM appointments WHERE shop_id = \${SHOP_ID} AND date = \${date} AND status = \${status} ORDER BY start_time\`
      : date
        ? await sql\`SELECT * FROM appointments WHERE shop_id = \${SHOP_ID} AND date = \${date} ORDER BY start_time\`
        : status
          ? await sql\`SELECT * FROM appointments WHERE shop_id = \${SHOP_ID} AND status = \${status} ORDER BY date, start_time\`
          : await sql\`SELECT * FROM appointments WHERE shop_id = \${SHOP_ID} ORDER BY date, start_time\`;
    res.json(rows);
  } catch (err) {
    console.error('[appointments] GET error:', err);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// POST /api/appointments
router.post('/', async (req: Request, res: Response) => {
  // Explicit casts from unknown to typed values (postgres.js requires typed params)
  const clientName  = String(req.body.clientName  ?? '');
  const clientPhone = String(req.body.clientPhone ?? '');
  const serviceId   = String(req.body.serviceId   ?? '');
  const date        = String(req.body.date        ?? '');
  const startTime   = String(req.body.startTime   ?? '');
  const notes       = String(req.body.notes       ?? '');
  const isOverbooked = Boolean(req.body.isOverbooked);

  if (!clientName || !serviceId || !date || !startTime) {
    res.status(400).json({ error: 'clientName, serviceId, date y startTime son requeridos' });
    return;
  }

  try {
    const [service] = await sql\`SELECT * FROM services WHERE id = \${serviceId} AND shop_id = \${SHOP_ID}\`;
    if (!service) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }
    const svc = service as Record<string, unknown>;

    const hoursViolation = await validateHours(SHOP_ID, date, startTime, Number(svc.duration));
    if (hoursViolation) { res.status(422).json(hoursViolation); return; }

    if (!isOverbooked) {
      const collisions = await findCollisions(SHOP_ID, date, startTime, Number(svc.duration));
      if (collisions.length > 0) {
        res.status(409).json({ error: 'Hay empalme de horarios', code: 'COLLISION', collisions });
        return;
      }
    }

    // Find or auto-create client by phone
    const cleanPhone = clientPhone.replace(/[^\\d]/g, '');
    let clientId: string;
    if (cleanPhone) {
      const [found] = await sql\`
        SELECT id FROM clients WHERE shop_id = \${SHOP_ID} AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE \${'%' + cleanPhone + '%'}
        LIMIT 1
      \`;
      clientId = found ? String((found as Record<string, unknown>).id) : '';
    } else {
      clientId = '';
    }
    if (!clientId) {
      const newId = 'cli_' + Date.now();
      await sql\`
        INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
        VALUES (\${newId}, \${SHOP_ID}, \${clientName}, \${clientPhone}, '', 0, FALSE)
      \`;
      clientId = newId;
    }

    const endTime = formatTime(parseTime(startTime) + Number(svc.duration));
    const id      = 'apt_' + Date.now();

    const [appt] = await sql\`
      INSERT INTO appointments
        (id, shop_id, client_id, client_name, client_phone,
         service_id, service_name, date, start_time, end_time,
         status, notes, price, duration, is_overbooked)
      VALUES (
        \${id}, \${SHOP_ID}, \${clientId}, \${clientName}, \${clientPhone},
        \${String(svc.id)}, \${String(svc.name)}, \${date}, \${startTime}, \${endTime},
        'Confirmada', \${notes}, \${Number(svc.price)}, \${Number(svc.duration)}, \${isOverbooked}
      )
      RETURNING *
    \`;
    res.status(201).json(appt);
  } catch (err) {
    console.error('[appointments] POST error:', err);
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

// PUT /api/appointments/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const statusVal    = req.body.status     != null ? String(req.body.status)    : undefined;
  const notesVal     = req.body.notes      != null ? String(req.body.notes)     : undefined;
  const startTimeVal = req.body.startTime  != null ? String(req.body.startTime) : undefined;
  const serviceIdVal = req.body.serviceId  != null ? String(req.body.serviceId) : undefined;
  const dateVal      = req.body.date       != null ? String(req.body.date)      : undefined;
  const overbookedVal= req.body.isOverbooked != null ? Boolean(req.body.isOverbooked) : undefined;

  try {
    const [existing] = await sql\`SELECT * FROM appointments WHERE id = \${id} AND shop_id = \${SHOP_ID}\`;
    if (!existing) { res.status(404).json({ error: 'Cita no encontrada' }); return; }
    const e = existing as Record<string, unknown>;

    const targetDate      = dateVal      ?? String(e.date);
    const targetStartTime = startTimeVal ?? String(e.start_time);
    const targetServiceId = serviceIdVal ?? String(e.service_id);

    const [svcRow] = await sql\`SELECT * FROM services WHERE id = \${targetServiceId}\`;
    const svc      = svcRow as Record<string, unknown> | undefined;
    const duration = svc ? Number(svc.duration) : Number(e.duration);

    if (startTimeVal || serviceIdVal || dateVal) {
      const hoursViolation = await validateHours(SHOP_ID, targetDate, targetStartTime, duration);
      if (hoursViolation) { res.status(422).json(hoursViolation); return; }

      if (!overbookedVal) {
        const collisions = await findCollisions(SHOP_ID, targetDate, targetStartTime, duration, id);
        if (collisions.length > 0) {
          res.status(409).json({ error: 'Hay empalme de horarios', code: 'COLLISION', collisions });
          return;
        }
      }
    }

    const newEndTime    = formatTime(parseTime(targetStartTime) + duration);
    const newStatus     = statusVal   ?? String(e.status);
    const newNotes      = notesVal    ?? String(e.notes);
    const newSvcName    = svc ? String(svc.name) : String(e.service_name);
    const newOverbooked = overbookedVal ?? Boolean(e.is_overbooked);

    const [updated] = await sql\`
      UPDATE appointments SET
        status        = \${newStatus},
        notes         = \${newNotes},
        start_time    = \${targetStartTime},
        end_time      = \${newEndTime},
        service_id    = \${targetServiceId},
        service_name  = \${newSvcName},
        date          = \${targetDate},
        is_overbooked = \${newOverbooked}
      WHERE id = \${id} AND shop_id = \${SHOP_ID}
      RETURNING *
    \`;
    res.json(updated);
  } catch (err) {
    console.error('[appointments] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await sql\`DELETE FROM appointments WHERE id = \${id} AND shop_id = \${SHOP_ID} RETURNING id\`;
    if (result.length === 0) { res.status(404).json({ error: 'Cita no encontrada' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[appointments] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

export default router;
`);

// Fix clients.ts - explicit casts
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
  const name       = String(req.body.name      ?? '');
  const phone      = String(req.body.phone     ?? '');
  const notes      = String(req.body.notes     ?? '');
  const noShowCount = Number(req.body.noShowCount ?? 0);
  const isFrequent  = Boolean(req.body.isFrequent);

  if (!name || !phone) {
    res.status(400).json({ error: 'name y phone son requeridos' });
    return;
  }
  const id = 'cli_' + Date.now();
  try {
    const [row] = await sql\`
      INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
      VALUES (\${id}, \${SHOP_ID}, \${name}, \${phone}, \${notes}, \${noShowCount}, \${isFrequent})
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
  try {
    const [existing] = await sql\`SELECT * FROM clients WHERE id = \${id} AND shop_id = \${SHOP_ID}\`;
    if (!existing) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    const e = existing as Record<string, unknown>;

    const name       = req.body.name       != null ? String(req.body.name)       : String(e.name);
    const phone      = req.body.phone      != null ? String(req.body.phone)      : String(e.phone);
    const notes      = req.body.notes      != null ? String(req.body.notes)      : String(e.notes);
    const noShowCount = req.body.noShowCount != null ? Number(req.body.noShowCount) : Number(e.no_show_count);
    const isFrequent  = req.body.isFrequent  != null ? Boolean(req.body.isFrequent) : Boolean(e.is_frequent);

    const [row] = await sql\`
      UPDATE clients SET
        name          = \${name},
        phone         = \${phone},
        notes         = \${notes},
        no_show_count = \${noShowCount},
        is_frequent   = \${isFrequent}
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
`);

console.log('appointments.ts and clients.ts fixed');
