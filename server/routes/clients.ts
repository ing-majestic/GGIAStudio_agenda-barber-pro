import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

function normalize(c: Record<string, unknown>) {
  return { ...c, noShowCount: c.no_show_count, isFrequent: Boolean(c.is_frequent) };
}

// GET /api/clients
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await sql`SELECT * FROM clients WHERE shop_id = ${SHOP_ID} ORDER BY name`;
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
    const [row] = await sql`
      INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
      VALUES (${id}, ${SHOP_ID}, ${name}, ${phone}, ${notes}, ${noShowCount}, ${isFrequent})
      RETURNING *
    `;
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
    const [existing] = await sql`SELECT * FROM clients WHERE id = ${id} AND shop_id = ${SHOP_ID}`;
    if (!existing) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    const e = existing as Record<string, unknown>;

    const name       = req.body.name       != null ? String(req.body.name)       : String(e.name);
    const phone      = req.body.phone      != null ? String(req.body.phone)      : String(e.phone);
    const notes      = req.body.notes      != null ? String(req.body.notes)      : String(e.notes);
    const noShowCount = req.body.noShowCount != null ? Number(req.body.noShowCount) : Number(e.no_show_count);
    const isFrequent  = req.body.isFrequent  != null ? Boolean(req.body.isFrequent) : Boolean(e.is_frequent);

    const [row] = await sql`
      UPDATE clients SET
        name          = ${name},
        phone         = ${phone},
        notes         = ${notes},
        no_show_count = ${noShowCount},
        is_frequent   = ${isFrequent}
      WHERE id = ${id} AND shop_id = ${SHOP_ID}
      RETURNING *
    `;
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
    const result = await sql`DELETE FROM clients WHERE id = ${id} AND shop_id = ${SHOP_ID} RETURNING id`;
    if (result.length === 0) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[clients] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
