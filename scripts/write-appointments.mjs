import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

writeFileSync(join(__dirname, '..', 'server', 'routes', 'appointments.ts'), `/**
 * Appointments routes — full CRUD with backend validations:
 *  - No appointments outside business hours (422)
 *  - No appointments on closed days (422)
 *  - Collision detection: overlapping appointments + blocked times (409)
 *  - Calculates endTime from service duration
 *  - Cancelled appointments excluded from collision checks
 *  - isOverbooked flag bypasses collision check when explicitly set
 */
import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// ── Helpers ───────────────────────────────────────────────────────────────

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
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
    const aEndBuf = aEnd + buffer;
    if (startMin < aEndBuf && endMin > aStart) {
      collisions.push({
        type:  'appointment',
        label: \`\${appt.client_name} (\${appt.start_time}–\${appt.end_time} +\${buffer}m buffer)\`
      });
    }
  }

  const blocks = await sql\`
    SELECT * FROM blocked_times WHERE shop_id = \${shopId} AND date = \${date}
  \`;
  for (const blk of blocks as Record<string, unknown>[]) {
    const bStart = parseTime(String(blk.start_time));
    const bEnd   = parseTime(String(blk.end_time));
    if (startMin < bEnd && endMin > bStart) {
      collisions.push({ type: 'blocked', label: \`Bloqueo: \${blk.label} (\${blk.start_time}–\${blk.end_time})\` });
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
  if (!workingDays.includes(dayOfWeek)) {
    return { error: \`El \${date} es día cerrado\`, code: 'CLOSED_DAY' };
  }

  const openMin  = parseTime(String(s.open_time));
  const closeMin = parseTime(String(s.close_time));
  const startMin = parseTime(startTime);
  const endMin   = startMin + duration;

  if (startMin < openMin) {
    return { error: \`La hora \${startTime} es antes de apertura (\${s.open_time})\`, code: 'OUTSIDE_HOURS' };
  }
  if (endMin > closeMin) {
    return { error: \`La cita terminaría a las \${formatTime(endMin)}, después de cierre (\${s.close_time})\`, code: 'OUTSIDE_HOURS' };
  }
  return null;
}

// ── GET /api/appointments?date=YYYY-MM-DD&status=Confirmada ───────────────

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

// ── POST /api/appointments ────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const { clientName, clientPhone, serviceId, date, startTime, notes, isOverbooked } = req.body as Record<string, unknown>;

  if (!clientName || !serviceId || !date || !startTime) {
    res.status(400).json({ error: 'clientName, serviceId, date y startTime son requeridos' });
    return;
  }

  try {
    const [service] = await sql\`SELECT * FROM services WHERE id = \${serviceId} AND shop_id = \${SHOP_ID}\`;
    if (!service) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }
    const svc = service as Record<string, unknown>;

    const hoursViolation = await validateHours(SHOP_ID, String(date), String(startTime), Number(svc.duration));
    if (hoursViolation) { res.status(422).json(hoursViolation); return; }

    if (!isOverbooked) {
      const collisions = await findCollisions(SHOP_ID, String(date), String(startTime), Number(svc.duration));
      if (collisions.length > 0) {
        res.status(409).json({ error: 'Hay empalme de horarios', code: 'COLLISION', collisions });
        return;
      }
    }

    // Find or auto-create client by phone
    const cleanPhone = String(clientPhone ?? '').replace(/[^\\d]/g, '');
    let client: Record<string, unknown> | undefined;
    if (cleanPhone) {
      const [found] = await sql\`
        SELECT * FROM clients WHERE shop_id = \${SHOP_ID} AND replace(phone, ' ', '') LIKE \${'%' + cleanPhone + '%'}
      \`;
      client = found as Record<string, unknown> | undefined;
    }
    if (!client) {
      const clientId = \`cli_\${Date.now()}\`;
      const [newClient] = await sql\`
        INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
        VALUES (\${clientId}, \${SHOP_ID}, \${String(clientName)}, \${String(clientPhone ?? '')}, '', 0, FALSE)
        RETURNING *
      \`;
      client = newClient as Record<string, unknown>;
    }

    const endTime = formatTime(parseTime(String(startTime)) + Number(svc.duration));
    const id      = \`apt_\${Date.now()}\`;

    const [appt] = await sql\`
      INSERT INTO appointments
        (id, shop_id, client_id, client_name, client_phone,
         service_id, service_name, date, start_time, end_time,
         status, notes, price, duration, is_overbooked)
      VALUES (
        \${id}, \${SHOP_ID},
        \${String(client.id)}, \${String(clientName)}, \${String(clientPhone ?? '')},
        \${String(svc.id)}, \${String(svc.name)},
        \${String(date)}, \${String(startTime)}, \${endTime},
        'Confirmada', \${String(notes ?? '')}, \${Number(svc.price)}, \${Number(svc.duration)},
        \${Boolean(isOverbooked)}
      )
      RETURNING *
    \`;
    res.status(201).json(appt);
  } catch (err) {
    console.error('[appointments] POST error:', err);
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

// ── PUT /api/appointments/:id ─────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes, startTime, serviceId, date, isOverbooked } = req.body as Record<string, unknown>;

  try {
    const [existing] = await sql\`SELECT * FROM appointments WHERE id = \${id} AND shop_id = \${SHOP_ID}\`;
    if (!existing) { res.status(404).json({ error: 'Cita no encontrada' }); return; }
    const e = existing as Record<string, unknown>;

    const targetDate      = String(date      ?? e.date);
    const targetStartTime = String(startTime ?? e.start_time);
    const targetServiceId = String(serviceId ?? e.service_id);
    const [svcRow] = await sql\`SELECT * FROM services WHERE id = \${targetServiceId}\`;
    const svc      = svcRow as Record<string, unknown> | undefined;
    const duration = svc ? Number(svc.duration) : Number(e.duration);

    if (startTime || serviceId || date) {
      const hoursViolation = await validateHours(SHOP_ID, targetDate, targetStartTime, duration);
      if (hoursViolation) { res.status(422).json(hoursViolation); return; }

      if (!isOverbooked) {
        const collisions = await findCollisions(SHOP_ID, targetDate, targetStartTime, duration, id);
        if (collisions.length > 0) {
          res.status(409).json({ error: 'Hay empalme de horarios', code: 'COLLISION', collisions });
          return;
        }
      }
    }

    const newEndTime = formatTime(parseTime(targetStartTime) + duration);

    const [updated] = await sql\`
      UPDATE appointments SET
        status       = \${status      ?? e.status},
        notes        = \${notes !== undefined ? String(notes) : e.notes},
        start_time   = \${targetStartTime},
        end_time     = \${newEndTime},
        service_id   = \${targetServiceId},
        service_name = \${svc ? String(svc.name) : e.service_name},
        date         = \${targetDate},
        is_overbooked = \${isOverbooked !== undefined ? Boolean(isOverbooked) : Boolean(e.is_overbooked)}
      WHERE id = \${id} AND shop_id = \${SHOP_ID}
      RETURNING *
    \`;
    res.json(updated);
  } catch (err) {
    console.error('[appointments] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// ── DELETE /api/appointments/:id ──────────────────────────────────────────

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
`, 'utf8');

console.log('appointments.ts written');
