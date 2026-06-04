import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/services
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await sql`SELECT * FROM services WHERE shop_id = ${SHOP_ID} ORDER BY name`;
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
  const id = `srv_${Date.now()}`;
  try {
    const [row] = await sql`
      INSERT INTO services (id, shop_id, name, duration, price, buffer, color)
      VALUES (${id}, ${SHOP_ID}, ${String(name)}, ${Number(duration)}, ${Number(price)}, ${Number(buffer ?? 5)}, ${String(color ?? '#C89B3C')})
      RETURNING *
    `;
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
    const [existing] = await sql`SELECT * FROM services WHERE id = ${id} AND shop_id = ${SHOP_ID}`;
    if (!existing) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }
    const [row] = await sql`
      UPDATE services SET
        name     = ${name     ?? existing.name},
        duration = ${Number(duration ?? existing.duration)},
        price    = ${Number(price    ?? existing.price)},
        buffer   = ${Number(buffer   ?? existing.buffer)},
        color    = ${color    ?? existing.color}
      WHERE id = ${id} AND shop_id = ${SHOP_ID}
      RETURNING *
    `;
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
    const result = await sql`DELETE FROM services WHERE id = ${id} AND shop_id = ${SHOP_ID} RETURNING id`;
    if (result.length === 0) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[services] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

export default router;
