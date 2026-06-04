import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/blocked-times?date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query as Record<string, string>;
    const rows = date
      ? await sql`SELECT * FROM blocked_times WHERE shop_id = ${SHOP_ID} AND date = ${date} ORDER BY start_time`
      : await sql`SELECT * FROM blocked_times WHERE shop_id = ${SHOP_ID} ORDER BY date, start_time`;
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
  const id = `blk_${Date.now()}`;
  try {
    const [row] = await sql`
      INSERT INTO blocked_times (id, shop_id, label, date, start_time, end_time)
      VALUES (${id}, ${SHOP_ID}, ${String(label)}, ${String(date)}, ${String(startTime)}, ${String(endTime)})
      RETURNING *
    `;
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
    const result = await sql`DELETE FROM blocked_times WHERE id = ${id} AND shop_id = ${SHOP_ID} RETURNING id`;
    if (result.length === 0) { res.status(404).json({ error: 'Bloqueo no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[blocked_times] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar bloqueo' });
  }
});

export default router;
