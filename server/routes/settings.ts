import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/settings
router.get('/', (_req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM settings WHERE shop_id = ?').get(SHOP_ID) as Record<string, unknown> | undefined;
    if (!row) { res.status(404).json({ error: 'Configuración no encontrada' }); return; }
    res.json({
      businessName:       row.business_name,
      openTime:           row.open_time,
      closeTime:          row.close_time,
      workingDays:        JSON.parse(String(row.working_days)),
      defaultBuffer:      row.default_buffer,
      whatsappTemplates:  JSON.parse(String(row.whatsapp_templates))
    });
  } catch (err) {
    console.error('[settings] GET error:', err);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PUT /api/settings
router.put('/', (req: Request, res: Response) => {
  const { businessName, openTime, closeTime, workingDays, defaultBuffer, whatsappTemplates } = req.body as Record<string, unknown>;
  try {
    const existing = db.prepare('SELECT * FROM settings WHERE shop_id = ?').get(SHOP_ID) as Record<string, unknown> | undefined;

    if (!existing) {
      // First-time insert
      db.prepare(`
        INSERT INTO settings (shop_id, business_name, open_time, close_time, working_days, default_buffer, whatsapp_templates)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        SHOP_ID,
        String(businessName ?? 'Agenda Barber Pro'),
        String(openTime     ?? '12:00'),
        String(closeTime    ?? '23:00'),
        JSON.stringify(workingDays ?? [0,2,3,4,5,6]),
        Number(defaultBuffer ?? 5),
        JSON.stringify(whatsappTemplates ?? {})
      );
    } else {
      db.prepare(`
        UPDATE settings
        SET business_name = ?, open_time = ?, close_time = ?,
            working_days = ?, default_buffer = ?, whatsapp_templates = ?
        WHERE shop_id = ?
      `).run(
        businessName    ?? existing.business_name,
        openTime        ?? existing.open_time,
        closeTime       ?? existing.close_time,
        workingDays     ? JSON.stringify(workingDays)        : existing.working_days,
        Number(defaultBuffer ?? existing.default_buffer),
        whatsappTemplates ? JSON.stringify(whatsappTemplates) : existing.whatsapp_templates,
        SHOP_ID
      );
    }

    const updated = db.prepare('SELECT * FROM settings WHERE shop_id = ?').get(SHOP_ID) as Record<string, unknown>;
    res.json({
      businessName:      updated.business_name,
      openTime:          updated.open_time,
      closeTime:         updated.close_time,
      workingDays:       JSON.parse(String(updated.working_days)),
      defaultBuffer:     updated.default_buffer,
      whatsappTemplates: JSON.parse(String(updated.whatsapp_templates))
    });
  } catch (err) {
    console.error('[settings] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

export default router;
