/**
 * Appointments routes — full CRUD with backend validations:
 *  • No appointments outside business hours (warns as 422)
 *  • No appointments on closed days (warns as 422)
 *  • Collision detection: overlapping appointments + blocked times (409)
 *  • Calculates endTime from service duration
 *  • Cancelled appointments excluded from collision checks
 *  • isOverbooked flag bypasses collision check when explicitly set
 */
import { Router, Request, Response } from 'express';
import { db } from '../db.js';

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
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type CollisionItem = { type: 'appointment' | 'blocked'; label: string };

function findCollisions(
  shopId: string,
  date: string,
  startTime: string,
  duration: number,
  excludeId?: string
): CollisionItem[] {
  const startMin = parseTime(startTime);
  const endMin   = startMin + duration;
  const collisions: CollisionItem[] = [];

  // Active appointments (excluding cancelled and the appointment being edited)
  const baseQuery = excludeId
    ? `SELECT a.*, s.buffer FROM appointments a
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.shop_id = ? AND a.date = ? AND a.status != 'Cancelada' AND a.id != ?`
    : `SELECT a.*, s.buffer FROM appointments a
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.shop_id = ? AND a.date = ? AND a.status != 'Cancelada'`;

  const apptArgs = excludeId ? [shopId, date, excludeId] : [shopId, date];
  const appointments = db.prepare(baseQuery).all(...apptArgs) as Record<string, unknown>[];

  for (const appt of appointments) {
    const aStart  = parseTime(String(appt.start_time));
    const aEnd    = parseTime(String(appt.end_time));
    const buffer  = Number(appt.buffer ?? 5);
    const aEndBuf = aEnd + buffer;
    if (startMin < aEndBuf && endMin > aStart) {
      collisions.push({
        type:  'appointment',
        label: `${appt.client_name} (${appt.start_time}–${appt.end_time} +${buffer}m buffer)`
      });
    }
  }

  // Blocked times
  const blocks = db.prepare(
    'SELECT * FROM blocked_times WHERE shop_id = ? AND date = ?'
  ).all(shopId, date) as Record<string, unknown>[];

  for (const blk of blocks) {
    const bStart = parseTime(String(blk.start_time));
    const bEnd   = parseTime(String(blk.end_time));
    if (startMin < bEnd && endMin > bStart) {
      collisions.push({ type: 'blocked', label: `Bloqueo: ${blk.label} (${blk.start_time}–${blk.end_time})` });
    }
  }

  return collisions;
}

type HoursViolation = { error: string; code: 'OUTSIDE_HOURS' | 'CLOSED_DAY' } | null;

function validateHours(shopId: string, date: string, startTime: string, duration: number): HoursViolation {
  const settings = db.prepare('SELECT * FROM settings WHERE shop_id = ?').get(shopId) as Record<string, unknown> | undefined;
  if (!settings) return null; // no settings yet — allow

  const workingDays: number[] = JSON.parse(String(settings.working_days));
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  if (!workingDays.includes(dayOfWeek)) {
    return { error: `El ${date} es día cerrado`, code: 'CLOSED_DAY' };
  }

  const openMin  = parseTime(String(settings.open_time));
  const closeMin = parseTime(String(settings.close_time));
  const startMin = parseTime(startTime);
  const endMin   = startMin + duration;

  if (startMin < openMin) {
    return { error: `La hora ${startTime} es antes de apertura (${settings.open_time})`, code: 'OUTSIDE_HOURS' };
  }
  if (endMin > closeMin) {
    return { error: `La cita terminaría a las ${formatTime(endMin)}, después de cierre (${settings.close_time})`, code: 'OUTSIDE_HOURS' };
  }
  return null;
}

function normalizeRow(row: Record<string, unknown>) {
  return {
    ...row,
    isOverbooked: Number(row.is_overbooked) === 1
  };
}

// ── GET /api/appointments?date=YYYY-MM-DD&status=Confirmada ───────────────

router.get('/', (req: Request, res: Response) => {
  try {
    const { date, status } = req.query as Record<string, string>;
    let query = 'SELECT * FROM appointments WHERE shop_id = ?';
    const args: unknown[] = [SHOP_ID];
    if (date)   { query += ' AND date = ?';   args.push(date); }
    if (status) { query += ' AND status = ?'; args.push(status); }
    query += ' ORDER BY date, start_time';
    const rows = (db.prepare(query).all(...args) as Record<string, unknown>[]).map(normalizeRow);
    res.json(rows);
  } catch (err) {
    console.error('[appointments] GET error:', err);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// ── POST /api/appointments ────────────────────────────────────────────────

router.post('/', (req: Request, res: Response) => {
  const { clientName, clientPhone, serviceId, date, startTime, notes, isOverbooked } = req.body as Record<string, unknown>;

  if (!clientName || !serviceId || !date || !startTime) {
    res.status(400).json({ error: 'clientName, serviceId, date y startTime son requeridos' });
    return;
  }

  try {
    const service = db.prepare('SELECT * FROM services WHERE id = ? AND shop_id = ?').get(serviceId, SHOP_ID) as Record<string, unknown> | undefined;
    if (!service) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }

    // Validate business hours (non-blocking warning — returns 422 so frontend can warn)
    const hoursViolation = validateHours(SHOP_ID, String(date), String(startTime), Number(service.duration));
    if (hoursViolation) {
      res.status(422).json(hoursViolation);
      return;
    }

    // Collision check — skip when frontend explicitly marks isOverbooked
    if (!isOverbooked) {
      const collisions = findCollisions(SHOP_ID, String(date), String(startTime), Number(service.duration));
      if (collisions.length > 0) {
        res.status(409).json({ error: 'Hay empalme de horarios', code: 'COLLISION', collisions });
        return;
      }
    }

    // Find or create client by phone (prevents duplicate clients)
    const cleanPhone = String(clientPhone ?? '').replace(/[^\d]/g, '');
    let client = cleanPhone
      ? db.prepare(`SELECT * FROM clients WHERE shop_id = ? AND replace(phone, ' ', '') LIKE ?`)
          .get(SHOP_ID, `%${cleanPhone}%`) as Record<string, unknown> | undefined
      : undefined;

    if (!client) {
      const clientId = `cli_${Date.now()}`;
      db.prepare(`
        INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
        VALUES (?, ?, ?, ?, '', 0, 0)
      `).run(clientId, SHOP_ID, String(clientName), String(clientPhone ?? ''));
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as Record<string, unknown>;
    }

    const endTime = formatTime(parseTime(String(startTime)) + Number(service.duration));
    const id      = `apt_${Date.now()}`;

    db.prepare(`
      INSERT INTO appointments
        (id, shop_id, client_id, client_name, client_phone,
         service_id, service_name, date, start_time, end_time,
         status, notes, price, duration, is_overbooked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmada', ?, ?, ?, ?)
    `).run(
      id, SHOP_ID,
      client.id, String(clientName), String(clientPhone ?? ''),
      service.id, service.name,
      String(date), String(startTime), endTime,
      String(notes ?? ''), Number(service.price), Number(service.duration),
      isOverbooked ? 1 : 0
    );

    const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json(normalizeRow(appt));
  } catch (err) {
    console.error('[appointments] POST error:', err);
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

// ── PUT /api/appointments/:id ─────────────────────────────────────────────

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes, startTime, serviceId, date, isOverbooked } = req.body as Record<string, unknown>;

  try {
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ? AND shop_id = ?').get(id, SHOP_ID) as Record<string, unknown> | undefined;
    if (!existing) { res.status(404).json({ error: 'Cita no encontrada' }); return; }

    const targetDate      = String(date      ?? existing.date);
    const targetStartTime = String(startTime ?? existing.start_time);
    const targetServiceId = String(serviceId ?? existing.service_id);
    const service         = db.prepare('SELECT * FROM services WHERE id = ?').get(targetServiceId) as Record<string, unknown> | undefined;
    const duration        = service ? Number(service.duration) : Number(existing.duration);

    // Only run validations when time/date/service changed
    if (startTime || serviceId || date) {
      const hoursViolation = validateHours(SHOP_ID, targetDate, targetStartTime, duration);
      if (hoursViolation) { res.status(422).json(hoursViolation); return; }

      if (!isOverbooked) {
        const collisions = findCollisions(SHOP_ID, targetDate, targetStartTime, duration, id);
        if (collisions.length > 0) {
          res.status(409).json({ error: 'Hay empalme de horarios', code: 'COLLISION', collisions });
          return;
        }
      }
    }

    const newEndTime = formatTime(parseTime(targetStartTime) + duration);

    db.prepare(`
      UPDATE appointments
      SET status = ?, notes = ?, start_time = ?, end_time = ?,
          service_id = ?, service_name = ?, date = ?, is_overbooked = ?
      WHERE id = ? AND shop_id = ?
    `).run(
      status      ?? existing.status,
      notes       !== undefined ? String(notes) : existing.notes,
      targetStartTime,
      newEndTime,
      targetServiceId,
      service ? service.name : existing.service_name,
      targetDate,
      isOverbooked !== undefined ? (isOverbooked ? 1 : 0) : existing.is_overbooked,
      id, SHOP_ID
    );

    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Record<string, unknown>;
    res.json(normalizeRow(updated));
  } catch (err) {
    console.error('[appointments] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// ── DELETE /api/appointments/:id ──────────────────────────────────────────

router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM appointments WHERE id = ? AND shop_id = ?').run(id, SHOP_ID);
    if (result.changes === 0) { res.status(404).json({ error: 'Cita no encontrada' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[appointments] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

export default router;
