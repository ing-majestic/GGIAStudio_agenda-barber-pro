import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/services
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM services WHERE shop_id = ? ORDER BY name').all(SHOP_ID);
    res.json(rows);
  } catch (err) {
    console.error('[services] GET error:', err);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// POST /api/services
router.post('/', (req: Request, res: Response) => {
  const { name, duration, price, buffer, color } = req.body as Record<string, unknown>;
  if (!name || !duration || price === undefined) {
    res.status(400).json({ error: 'name, duration y price son requeridos' });
    return;
  }
  const id = `srv_${Date.now()}`;
  try {
    db.prepare(`
      INSERT INTO services (id, shop_id, name, duration, price, buffer, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, SHOP_ID, String(name), Number(duration), Number(price), Number(buffer ?? 5), String(color ?? '#C89B3C'));
    res.status(201).json(db.prepare('SELECT * FROM services WHERE id = ?').get(id));
  } catch (err) {
    console.error('[services] POST error:', err);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// PUT /api/services/:id
router.put('/:id', (req: Request, res: Response) => {
  const { name, duration, price, buffer, color } = req.body as Record<string, unknown>;
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM services WHERE id = ? AND shop_id = ?').get(id, SHOP_ID) as Record<string, unknown> | undefined;
    if (!existing) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }
    db.prepare(`
      UPDATE services SET name = ?, duration = ?, price = ?, buffer = ?, color = ?
      WHERE id = ? AND shop_id = ?
    `).run(
      name      ?? existing.name,
      Number(duration ?? existing.duration),
      Number(price    ?? existing.price),
      Number(buffer   ?? existing.buffer),
      color     ?? existing.color,
      id, SHOP_ID
    );
    res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(id));
  } catch (err) {
    console.error('[services] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

// DELETE /api/services/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM services WHERE id = ? AND shop_id = ?').run(id, SHOP_ID);
    if (result.changes === 0) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[services] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

export default router;
