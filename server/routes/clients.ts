import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/clients
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM clients WHERE shop_id = ? ORDER BY name').all(SHOP_ID);
    // Normalize SQLite integers to JS booleans for the frontend
    const normalized = (rows as Record<string, unknown>[]).map(c => ({
      ...c,
      noShowCount: c.no_show_count,
      isFrequent:  Number(c.is_frequent) === 1
    }));
    res.json(normalized);
  } catch (err) {
    console.error('[clients] GET error:', err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// POST /api/clients
router.post('/', (req: Request, res: Response) => {
  const { name, phone, notes, noShowCount, isFrequent } = req.body as Record<string, unknown>;
  if (!name || !phone) {
    res.status(400).json({ error: 'name y phone son requeridos' });
    return;
  }
  const id = `cli_${Date.now()}`;
  try {
    db.prepare(`
      INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, SHOP_ID, String(name), String(phone), String(notes ?? ''), Number(noShowCount ?? 0), isFrequent ? 1 : 0);
    const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json({ ...row, noShowCount: row.no_show_count, isFrequent: Number(row.is_frequent) === 1 });
  } catch (err) {
    console.error('[clients] POST error:', err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clients/:id
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, notes, noShowCount, isFrequent } = req.body as Record<string, unknown>;
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ? AND shop_id = ?').get(id, SHOP_ID) as Record<string, unknown> | undefined;
    if (!existing) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    db.prepare(`
      UPDATE clients SET name = ?, phone = ?, notes = ?, no_show_count = ?, is_frequent = ?
      WHERE id = ? AND shop_id = ?
    `).run(
      name         ?? existing.name,
      phone        ?? existing.phone,
      notes        ?? existing.notes,
      Number(noShowCount ?? existing.no_show_count),
      isFrequent !== undefined ? (isFrequent ? 1 : 0) : existing.is_frequent,
      id, SHOP_ID
    );
    const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Record<string, unknown>;
    res.json({ ...row, noShowCount: row.no_show_count, isFrequent: Number(row.is_frequent) === 1 });
  } catch (err) {
    console.error('[clients] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM clients WHERE id = ? AND shop_id = ?').run(id, SHOP_ID);
    if (result.changes === 0) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[clients] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
