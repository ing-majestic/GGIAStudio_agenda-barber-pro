/**
 * Seed initial demo data if the database is empty.
 * Uses today's real date so appointments are always relevant.
 */
import { db } from './db.js';

const SHOP_ID = 'shop1';

const DEFAULT_TEMPLATES = JSON.stringify({
  availability:  "¡Hola {cliente}! 💈 Aquí tienes mis horarios disponibles para el {fecha} ({servicio}):\n\n{horarios}\n\n¿Cuál te queda mejor?",
  confirmation:  "¡Listo {cliente}! 🔥 Cita confirmada para el {fecha} a las {hora}. Servicio: {servicio}. ¡Te espero puntualmente! 💈",
  reschedule:    "Hola {cliente} 👋 Hemos movido tu cita para el {fecha} a las {hora}. ¿Todo en orden? ¡Nos vemos!",
  cancellation:  "Hola {cliente}. Tu cita del {fecha} a las {hora} ha sido cancelada. Si deseas reagendar, avísame. Saludos 💈",
  reminder:      "Qué tal {cliente} 👋 Te recuerdo tu cita de hoy a las {hora} para {servicio}. ¡Nos vemos en un rato! 💈"
});

/** Build a YYYY-MM-DD string from a Date (local timezone) */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function seedIfEmpty(): Promise<void> {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM services WHERE shop_id = ?').get(SHOP_ID) as { n: number }).n;
  if (count > 0) return; // Database already has data — skip

  console.log('[seed] Populating initial demo data …');

  // ── Settings ─────────────────────────────────────────────────────────────
  db.prepare(`
    INSERT OR IGNORE INTO settings
      (shop_id, business_name, open_time, close_time, working_days, default_buffer, whatsapp_templates)
    VALUES (?, 'Agenda Barber Pro', '12:00', '23:00', '[0,2,3,4,5,6]', 5, ?)
  `).run(SHOP_ID, DEFAULT_TEMPLATES);

  // ── Services ─────────────────────────────────────────────────────────────
  const insertSrv = db.prepare(`
    INSERT OR IGNORE INTO services (id, shop_id, name, duration, price, buffer, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertSrv.run('srv1', SHOP_ID, 'Corte Clásico',              30, 200, 5,  '#C89B3C');
  insertSrv.run('srv2', SHOP_ID, 'Corte y Barba Premium',      60, 350, 10, '#3AA6B9');
  insertSrv.run('srv3', SHOP_ID, 'Ritual de Toalla Caliente',  45, 250, 5,  '#60A5FA');
  insertSrv.run('srv4', SHOP_ID, 'Camuflaje de Canas',         40, 300, 5,  '#F59E0B');
  insertSrv.run('srv5', SHOP_ID, 'Perfilado de Barba',         25, 120, 5,  '#22C55E');

  // ── Clients ───────────────────────────────────────────────────────────────
  const insertCli = db.prepare(`
    INSERT OR IGNORE INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertCli.run('cli1', SHOP_ID, 'Juan Pérez',      '5512345678', 'Prefiere corte con tijera arriba y desvanecido medio.', 0, 1);
  insertCli.run('cli2', SHOP_ID, 'Carlos Mendoza',  '5587654321', 'Usa cera mate. Le gusta platicar de fútbol.',           1, 1);
  insertCli.run('cli3', SHOP_ID, 'Alejandro Torres','5571239922', 'Cliente nuevo, recomendación de Juan.',                 0, 0);
  insertCli.run('cli4', SHOP_ID, 'Roberto G.',      '5544332211', 'Ha faltado sin avisar dos veces. Cobrar anticipado.',   2, 0);
  insertCli.run('cli5', SHOP_ID, 'Diego Loera',     '5555551234', 'Corte de barba muy detallado. Bebe café americano.',    0, 1);

  // ── Appointments (using real today/tomorrow) ───────────────────────────────
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const todayStr    = toDateStr(today);
  const tomorrowStr = toDateStr(tomorrow);

  const insertAppt = db.prepare(`
    INSERT OR IGNORE INTO appointments
      (id, shop_id, client_id, client_name, client_phone,
       service_id, service_name, date, start_time, end_time,
       status, notes, price, duration, is_overbooked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAppt.run('apt1', SHOP_ID, 'cli1','Juan Pérez',      '5512345678','srv1','Corte Clásico',             todayStr,   '12:30','13:00','Atendida',   'Llegó puntual',                        200, 30, 0);
  insertAppt.run('apt2', SHOP_ID, 'cli2','Carlos Mendoza',  '5587654321','srv2','Corte y Barba Premium',     todayStr,   '14:00','15:00','Confirmada', 'Prefiere barba corta',                 350, 60, 0);
  insertAppt.run('apt3', SHOP_ID, 'cli3','Alejandro Torres','5571239922','srv3','Ritual de Toalla Caliente', todayStr,   '16:30','17:15','Confirmada', 'Cliente nuevo',                        250, 45, 0);
  insertAppt.run('apt4', SHOP_ID, 'cli4','Roberto G.',      '5544332211','srv1','Corte Clásico',             todayStr,   '19:00','19:30','Pendiente',  'Enviar recordatorio por WhatsApp',     200, 30, 0);
  insertAppt.run('apt5', SHOP_ID, 'cli5','Diego Loera',     '5555551234','srv5','Perfilado de Barba',        tomorrowStr,'13:00','13:25','Confirmada', 'Cliente muy leal',                     120, 25, 0);
  insertAppt.run('apt6', SHOP_ID, 'cli1','Juan Pérez',      '5512345678','srv2','Corte y Barba Premium',     tomorrowStr,'17:00','18:00','Pendiente',  'Cambió de corte clásico a premium',    350, 60, 0);

  // ── Blocked times ─────────────────────────────────────────────────────────
  const insertBlk = db.prepare(`
    INSERT OR IGNORE INTO blocked_times (id, shop_id, label, date, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertBlk.run('blk1', SHOP_ID, 'Comida 🍔',   todayStr, '15:15', '16:00');
  insertBlk.run('blk2', SHOP_ID, 'Descanso ☕', todayStr, '18:00', '18:20');

  console.log(`[seed] Done — seeded for today=${todayStr}, tomorrow=${tomorrowStr}`);
}
