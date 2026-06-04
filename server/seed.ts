/**
 * Seed initial demo data if the database is empty.
 * Uses today's real date so appointments are always relevant.
 */
import { sql } from './db.js';

const SHOP_ID = 'shop1';

const DEFAULT_TEMPLATES = JSON.stringify({
  availability:  "¡Hola {cliente}! 💈 Aquí tienes mis horarios disponibles para el {fecha} ({servicio}):  {horarios}  ¿Cuál te queda mejor?",
  confirmation:  "¡Listo {cliente}! 🔥 Cita confirmada para el {fecha} a las {hora}. Servicio: {servicio}. ¡Te espero puntualmente! 💈",
  reschedule:    "Hola {cliente} 👋 Hemos movido tu cita para el {fecha} a las {hora}. ¿Todo en orden? ¡Nos vemos!",
  cancellation:  "Hola {cliente}. Tu cita del {fecha} a las {hora} ha sido cancelada. Si deseas reagendar, avísame. Saludos 💈",
  reminder:      "Qué tal {cliente} 👋 Te recuerdo tu cita de hoy a las {hora} para {servicio}. ¡Nos vemos en un rato! 💈"
});

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function seedIfEmpty(): Promise<void> {
  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count FROM services WHERE shop_id = ${SHOP_ID}
  `;
  if (Number(count) > 0) return;

  console.log('[seed] Populating initial demo data ...');

  const today    = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(Date.now() + 86_400_000));

  // Settings
  await sql`
    INSERT INTO settings (shop_id, business_name, open_time, close_time, working_days, default_buffer, whatsapp_templates)
    VALUES (${SHOP_ID}, 'Barber Studio Pro', '12:00', '23:00', '[0,2,3,4,5,6]', 5, ${DEFAULT_TEMPLATES})
    ON CONFLICT (shop_id) DO NOTHING
  `;

  // Services
  const services = [
    { id: 'srv_001', name: 'Corte Clásico',           duration: 30, price: 180, buffer: 5, color: '#C89B3C' },
    { id: 'srv_002', name: 'Corte y Barba Premium',    duration: 60, price: 350, buffer: 10, color: '#8B5CF6' },
    { id: 'srv_003', name: 'Perfilado de Barba',       duration: 30, price: 120, buffer: 5, color: '#3B82F6' },
    { id: 'srv_004', name: 'Camuflaje de Canas',       duration: 45, price: 250, buffer: 10, color: '#10B981' },
    { id: 'srv_005', name: 'Ritual de Toalla Caliente',duration: 20, price: 80,  buffer: 0, color: '#F59E0B' },
  ];
  for (const s of services) {
    await sql`
      INSERT INTO services (id, shop_id, name, duration, price, buffer, color)
      VALUES (${s.id}, ${SHOP_ID}, ${s.name}, ${s.duration}, ${s.price}, ${s.buffer}, ${s.color})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Clients
  const clients = [
    { id: 'cli_001', name: 'Carlos Mendoza',   phone: '55 1234-5678', notes: 'Prefiere sin máquina en nuca', noShow: 0, freq: true  },
    { id: 'cli_002', name: 'Ernesto Vargas',   phone: '55 9876-5432', notes: '',                             noShow: 1, freq: false },
    { id: 'cli_003', name: 'Miguel Ángel Ruiz',phone: '55 5555-0101', notes: 'Cliente VIP, trato especial',  noShow: 0, freq: true  },
    { id: 'cli_004', name: 'Roberto Sánchez',  phone: '55 4444-2222', notes: '',                             noShow: 0, freq: false },
    { id: 'cli_005', name: 'David Castillo',   phone: '55 3333-9999', notes: 'Alérgico a ciertos productos', noShow: 2, freq: false },
  ];
  for (const c of clients) {
    await sql`
      INSERT INTO clients (id, shop_id, name, phone, notes, no_show_count, is_frequent)
      VALUES (${c.id}, ${SHOP_ID}, ${c.name}, ${c.phone}, ${c.notes}, ${c.noShow}, ${c.freq})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Appointments (today and tomorrow)
  const appointments = [
    { id: 'apt_001', clientId: 'cli_001', clientName: 'Carlos Mendoza',    clientPhone: '55 1234-5678', serviceId: 'srv_001', serviceName: 'Corte Clásico',         date: today,    start: '14:00', end: '14:30', price: 180, dur: 30, status: 'Confirmada' },
    { id: 'apt_002', clientId: 'cli_002', clientName: 'Ernesto Vargas',    clientPhone: '55 9876-5432', serviceId: 'srv_002', serviceName: 'Corte y Barba Premium', date: today,    start: '15:00', end: '16:00', price: 350, dur: 60, status: 'Confirmada' },
    { id: 'apt_003', clientId: 'cli_003', clientName: 'Miguel Ángel Ruiz', clientPhone: '55 5555-0101', serviceId: 'srv_003', serviceName: 'Perfilado de Barba',    date: today,    start: '17:00', end: '17:30', price: 120, dur: 30, status: 'Pendiente'  },
    { id: 'apt_004', clientId: 'cli_004', clientName: 'Roberto Sánchez',   clientPhone: '55 4444-2222', serviceId: 'srv_001', serviceName: 'Corte Clásico',         date: today,    start: '18:00', end: '18:30', price: 180, dur: 30, status: 'Confirmada' },
    { id: 'apt_005', clientId: 'cli_005', clientName: 'David Castillo',    clientPhone: '55 3333-9999', serviceId: 'srv_004', serviceName: 'Camuflaje de Canas',    date: tomorrow, start: '14:00', end: '14:45', price: 250, dur: 45, status: 'Confirmada' },
    { id: 'apt_006', clientId: 'cli_001', clientName: 'Carlos Mendoza',    clientPhone: '55 1234-5678', serviceId: 'srv_005', serviceName: 'Ritual de Toalla Caliente', date: tomorrow, start: '15:30', end: '15:50', price: 80, dur: 20, status: 'Confirmada' },
  ];
  for (const a of appointments) {
    await sql`
      INSERT INTO appointments
        (id, shop_id, client_id, client_name, client_phone, service_id, service_name,
         date, start_time, end_time, status, notes, price, duration, is_overbooked)
      VALUES
        (${a.id}, ${SHOP_ID}, ${a.clientId}, ${a.clientName}, ${a.clientPhone},
         ${a.serviceId}, ${a.serviceName}, ${a.date}, ${a.start}, ${a.end},
         ${a.status}, '', ${a.price}, ${a.dur}, FALSE)
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Blocked times
  await sql`
    INSERT INTO blocked_times (id, shop_id, label, date, start_time, end_time)
    VALUES ('blk_001', ${SHOP_ID}, 'Comida', ${today}, '13:00', '14:00')
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO blocked_times (id, shop_id, label, date, start_time, end_time)
    VALUES ('blk_002', ${SHOP_ID}, 'Descanso tarde', ${tomorrow}, '16:30', '17:00')
    ON CONFLICT (id) DO NOTHING
  `;

  console.log(`[seed] Done — seeded for today=${today}, tomorrow=${tomorrow}`);
}
