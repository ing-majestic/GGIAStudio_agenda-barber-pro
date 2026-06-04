import { Router, Request, Response } from 'express';
import { sql } from '../db.js';

const router = Router();
const SHOP_ID = 'shop1';

// GET /api/settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [row] = await sql`SELECT * FROM settings WHERE shop_id = ${SHOP_ID}`;
    if (!row) { res.status(404).json({ error: 'Configuración no encontrada' }); return; }
    const r = row as Record<string, unknown>;
    res.json({
      businessName:      r.business_name,
      openTime:          r.open_time,
      closeTime:         r.close_time,
      workingDays:       JSON.parse(String(r.working_days)),
      defaultBuffer:     r.default_buffer,
      whatsappTemplates: JSON.parse(String(r.whatsapp_templates))
    });
  } catch (err) {
    console.error('[settings] GET error:', err);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
  const { businessName, openTime, closeTime, workingDays, defaultBuffer, whatsappTemplates } = req.body as Record<string, unknown>;
  try {
    await sql`
      INSERT INTO settings (shop_id, business_name, open_time, close_time, working_days, default_buffer, whatsapp_templates)
      VALUES (
        ${SHOP_ID},
        ${String(businessName ?? 'Agenda Barber Pro')},
        ${String(openTime     ?? '12:00')},
        ${String(closeTime    ?? '23:00')},
        ${JSON.stringify(workingDays ?? [0,2,3,4,5,6])},
        ${Number(defaultBuffer ?? 5)},
        ${JSON.stringify(whatsappTemplates ?? {})}
      )
      ON CONFLICT (shop_id) DO UPDATE SET
        business_name      = EXCLUDED.business_name,
        open_time          = EXCLUDED.open_time,
        close_time         = EXCLUDED.close_time,
        working_days       = EXCLUDED.working_days,
        default_buffer     = EXCLUDED.default_buffer,
        whatsapp_templates = EXCLUDED.whatsapp_templates
    `;
    const [row] = await sql`SELECT * FROM settings WHERE shop_id = ${SHOP_ID}`;
    const r = row as Record<string, unknown>;
    res.json({
      businessName:      r.business_name,
      openTime:          r.open_time,
      closeTime:         r.close_time,
      workingDays:       JSON.parse(String(r.working_days)),
      defaultBuffer:     r.default_buffer,
      whatsappTemplates: JSON.parse(String(r.whatsapp_templates))
    });
  } catch (err) {
    console.error('[settings] PUT error:', err);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

export default router;
