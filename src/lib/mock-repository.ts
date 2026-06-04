import { Service, Client, Appointment, BlockedTime, BusinessSettings } from '../types';

// Fallback initial structures directly embedded for guaranteed safe runtime and compile checks
const INITIAL_SERVICES: Service[] = [
  { id: "srv1", name: "Corte Clásico", duration: 30, price: 200, buffer: 5, color: "#C89B3C" },
  { id: "srv2", name: "Corte y Barba Premium", duration: 60, price: 350, buffer: 10, color: "#3AA6B9" },
  { id: "srv3", name: "Ritual de Toalla Caliente", duration: 45, price: 250, buffer: 5, color: "#60A5FA" },
  { id: "srv4", name: "Camuflaje de Canas", duration: 40, price: 300, buffer: 5, color: "#F59E0B" },
  { id: "srv5", name: "Perfilado de Barba", duration: 25, price: 120, buffer: 5, color: "#22C55E" }
];

const INITIAL_CLIENTS: Client[] = [
  { id: "cli1", name: "Juan Pérez", phone: "5512345678", notes: "Prefiere corte con tijera arriba y desvanecido medio.", noShowCount: 0, isFrequent: true },
  { id: "cli2", name: "Carlos Mendoza", phone: "5587654321", notes: "Usa cera mate. Le gusta platicar de fútbol.", noShowCount: 1, isFrequent: true },
  { id: "cli3", name: "Alejandro Torres", phone: "5571239922", notes: "Cliente nuevo, recomendación de Juan.", noShowCount: 0, isFrequent: false },
  { id: "cli4", name: "Roberto G.", phone: "5544332211", notes: "Ha faltado sin avisar dos veces. Cobrar anticipado.", noShowCount: 2, isFrequent: false },
  { id: "cli5", name: "Diego Loera", phone: "5555551234", notes: "Corte de barba muy detallado. Bebe café americano.", noShowCount: 0, isFrequent: true }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt1",
    clientId: "cli1",
    clientName: "Juan Pérez",
    clientPhone: "5512345678",
    serviceId: "srv1",
    serviceName: "Corte Clásico",
    date: "2026-06-04",
    startTime: "12:30",
    endTime: "13:00",
    status: "Atendida",
    notes: "Llegó puntual",
    price: 200,
    duration: 30
  },
  {
    id: "apt2",
    clientId: "cli2",
    clientName: "Carlos Mendoza",
    clientPhone: "5587654321",
    serviceId: "srv2",
    serviceName: "Corte y Barba Premium",
    date: "2026-06-04",
    startTime: "14:00",
    endTime: "15:00",
    status: "En atención",
    notes: "Prefiere barba corta",
    price: 350,
    duration: 60
  },
  {
    id: "apt3",
    clientId: "cli3",
    clientName: "Alejandro Torres",
    clientPhone: "5571239922",
    serviceId: "srv3",
    serviceName: "Ritual de Toalla Caliente",
    date: "2026-06-04",
    startTime: "16:30",
    endTime: "17:15",
    status: "Confirmada",
    notes: "Cliente nuevo",
    price: 250,
    duration: 45
  },
  {
    id: "apt4",
    clientId: "cli4",
    clientName: "Roberto G.",
    clientPhone: "5544332211",
    serviceId: "srv1",
    serviceName: "Corte Clásico",
    date: "2026-06-04",
    startTime: "19:00",
    endTime: "19:30",
    status: "Pendiente",
    notes: "Enviar recordatorio por WhatsApp",
    price: 200,
    duration: 30
  },
  {
    id: "apt5",
    clientId: "cli5",
    clientName: "Diego Loera",
    clientPhone: "5555551234",
    serviceId: "srv5",
    serviceName: "Perfilado de Barba",
    date: "2026-06-05",
    startTime: "13:00",
    endTime: "13:25",
    status: "Confirmada",
    notes: "Cliente muy leal",
    price: 120,
    duration: 25
  },
  {
    id: "apt6",
    clientId: "cli1",
    clientName: "Juan Pérez",
    clientPhone: "5512345678",
    serviceId: "srv2",
    serviceName: "Corte y Barba Premium",
    date: "2026-06-05",
    startTime: "17:00",
    endTime: "18:00",
    status: "Pendiente",
    notes: "Cambió de corte clásico a premium",
    price: 350,
    duration: 60
  }
];

const INITIAL_BLOCKED_TIMES: BlockedTime[] = [
  {
    id: "blk1",
    label: "Comida 🍔",
    date: "2026-06-04",
    startTime: "15:15",
    endTime: "16:00"
  },
  {
    id: "blk2",
    label: "Descanso ☕",
    date: "2026-06-04",
    startTime: "18:00",
    endTime: "18:20"
  }
];

const INITIAL_SETTINGS: BusinessSettings = {
  businessName: "Agenda Barber Pro",
  openTime: "12:00",
  closeTime: "23:00",
  workingDays: [0, 2, 3, 4, 5, 6], // closed monday (1)
  defaultBuffer: 5,
  whatsappTemplates: {
    availability: "¡Hola {cliente}! 💈 Aquí tienes mis horarios disponibles para el {fecha} ({servicio}):\n\n{horarios}\n\n¿Cuál te queda mejor?",
    confirmation: "¡Listo {cliente}! 🔥 Cita confirmada para el {fecha} a las {hora}. Servicio: {servicio}. ¡Te espero puntualmente! 💈",
    reschedule: "Hola {cliente} 👋 Hemos movido tu cita para el {fecha} a las {hora}. ¿Todo en orden? ¡Nos vemos!",
    cancellation: "Hola {cliente}. Tu cita del {fecha} a las {hora} ha sido cancelada. Si deseas reagendar, avísame. Saludos 💈",
    reminder: "Qué tal {cliente} 👋 Te recuerdo tu cita de hoy a las {hora} para {servicio}. ¡Nos vemos en un rato! 💈"
  }
};

const KEYS = {
  SERVICES: 'barber_services',
  CLIENTS: 'barber_clients',
  APPOINTMENTS: 'barber_appointments',
  BLOCKED_TIMES: 'barber_blocked_times',
  SETTINGS: 'barber_settings'
};

class MockRepository {
  private get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving map state to localStorage', e);
    }
  }

  // SERVICES
  getServices(): Service[] {
    return this.get<Service[]>(KEYS.SERVICES, INITIAL_SERVICES);
  }

  saveService(service: Service): void {
    const list = this.getServices();
    const idx = list.findIndex(s => s.id === service.id);
    if (idx >= 0) {
      list[idx] = service;
    } else {
      list.push(service);
    }
    this.set(KEYS.SERVICES, list);
  }

  deleteService(id: string): void {
    const list = this.getServices().filter(s => s.id !== id);
    this.set(KEYS.SERVICES, list);
  }

  // CLIENTS
  getClients(): Client[] {
    return this.get<Client[]>(KEYS.CLIENTS, INITIAL_CLIENTS);
  }

  saveClient(client: Client): Client {
    const list = this.getClients();
    const idx = list.findIndex(c => c.id === client.id);
    if (idx >= 0) {
      list[idx] = client;
    } else {
      list.push(client);
    }
    this.set(KEYS.CLIENTS, list);
    return client;
  }

  getOrCreateClient(name: string, phone: string): Client {
    const clients = this.getClients();
    const cleanPhone = phone.replace(/[^\d]/g, '');
    let client = clients.find(c => c.phone.replace(/[^\d]/g, '') === cleanPhone);

    if (!client) {
      const newClient: Client = {
        id: `cli_${Date.now()}`,
        name,
        phone,
        noShowCount: 0,
        isFrequent: false
      };
      return this.saveClient(newClient);
    }
    return client;
  }

  // APPOINTMENTS
  getAppointments(): Appointment[] {
    return this.get<Appointment[]>(KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  }

  saveAppointment(appointment: Appointment): void {
    const list = this.getAppointments();
    const idx = list.findIndex(a => a.id === appointment.id);
    if (idx >= 0) {
      list[idx] = appointment;
    } else {
      list.push(appointment);
    }
    this.set(KEYS.APPOINTMENTS, list);
  }

  deleteAppointment(id: string): void {
    const list = this.getAppointments().filter(a => a.id !== id);
    this.set(KEYS.APPOINTMENTS, list);
  }

  // BLOCKED TIMES
  getBlockedTimes(): BlockedTime[] {
    return this.get<BlockedTime[]>(KEYS.BLOCKED_TIMES, INITIAL_BLOCKED_TIMES);
  }

  saveBlockedTime(block: BlockedTime): void {
    const list = this.getBlockedTimes();
    const idx = list.findIndex(b => b.id === block.id);
    if (idx >= 0) {
      list[idx] = block;
    } else {
      list.push(block);
    }
    this.set(KEYS.BLOCKED_TIMES, list);
  }

  deleteBlockedTime(id: string): void {
    const list = this.getBlockedTimes().filter(b => b.id !== id);
    this.set(KEYS.BLOCKED_TIMES, list);
  }

  // SETTINGS
  getSettings(): BusinessSettings {
    return this.get<BusinessSettings>(KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  saveSettings(settings: BusinessSettings): void {
    this.set(KEYS.SETTINGS, settings);
  }

  // Helpers to restore default mockup data if requested
  resetToDefaults(): void {
    this.set(KEYS.SERVICES, INITIAL_SERVICES);
    this.set(KEYS.CLIENTS, INITIAL_CLIENTS);
    this.set(KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
    this.set(KEYS.BLOCKED_TIMES, INITIAL_BLOCKED_TIMES);
    this.set(KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  /**
   * Bulk-updates the localStorage cache from server data so the availability
   * engine (which reads synchronously from this repository) stays in sync with
   * the backend without requiring an async refactor.
   */
  updateCache(data: {
    appointments?: Appointment[];
    services?: Service[];
    clients?: Client[];
    blockedTimes?: BlockedTime[];
    settings?: BusinessSettings;
  }): void {
    if (data.appointments !== undefined) this.set(KEYS.APPOINTMENTS, data.appointments);
    if (data.services !== undefined) this.set(KEYS.SERVICES, data.services);
    if (data.clients !== undefined) this.set(KEYS.CLIENTS, data.clients);
    if (data.blockedTimes !== undefined) this.set(KEYS.BLOCKED_TIMES, data.blockedTimes);
    if (data.settings !== undefined) this.set(KEYS.SETTINGS, data.settings);
  }
}

export const repository = new MockRepository();
export default repository;
