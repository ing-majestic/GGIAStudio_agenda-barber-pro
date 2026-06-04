import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/blocked-times?date=YYYY-MM-DD
router.get('/', (req: Request, res: Response) => {
  try {
    const { date } = req.query as Record<string, string>;
    let query = 'SELECT * FROM blocked_times WHERE shop_id = ?';
    const args: unknown[] = [SHOP_ID];
    if (date) { query += ' AND date = ?'; args.push(date); }
    query += ' ORDER BY date, start_time';
    res.json(db.prepare(query).all(...args));
  } catch (err) {
    console.error('[blocked_times] GET error:', err);
    res.status(500).json({ error: 'Error al obtener bloqueos' });
  }
});

// POST /api/blocked-times
router.post('/', (req: Request, res: Response) => {
  const { label, date, startTime, endTime } = req.body as Record<string, unknown>;
  if (!label || !date || !startTime || !endTime) {
    res.status(400).json({ error: 'label, date, startTime y endTime son requeridos' });
    return;
  }
  const id = `blk_${Date.now()}`;
  try {
    db.prepare(`
      INSERT INTO blocked_times (id, shop_id, label, date, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, SHOP_ID, String(label), String(date), String(startTime), String(endTime));
    res.status(201).json(db.prepare('SELECT * FROM blocked_times WHERE id = ?').get(id));
  } catch (err) {
    console.error('[blocked_times] POST error:', err);
    res.status(500).json({ error: 'Error al crear bloqueo' });
  }
});

// DELETE /api/blocked-times/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM blocked_times WHERE id = ? AND shop_id = ?').run(id, SHOP_ID);
    if (result.changes === 0) { res.status(404).json({ error: 'Bloqueo no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[blocked_times] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar bloqueo' });
  }
});

export default router;
