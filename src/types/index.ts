export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  buffer: number; // in minutes
  color: string; // visual accent
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  noShowCount: number;
  isFrequent: boolean;
}

export type AppointmentStatus =
  | 'Confirmada'
  | 'Pendiente'
  | 'Llegó'
  | 'En atención'
  | 'Atendida'
  | 'Cancelada'
  | 'No asistió';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: AppointmentStatus;
  notes?: string;
  price: number;
  duration: number;
  /** True if this appointment was deliberately saved despite a time collision (sobrecupo) */
  isOverbooked?: boolean;
}

export interface BlockedTime {
  id: string;
  label: string; // e.g., "Comida", "Descanso", "Personal"
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface BusinessSettings {
  businessName: string;
  openTime: string; // "12:00"
  closeTime: string; // "23:00"
  workingDays: number[]; // [0, 2, 3, 4, 5, 6] (closed Monday = day 1)
  defaultBuffer: number; // minutes
  whatsappTemplates: {
    availability: string;
    confirmation: string;
    reschedule: string;
    cancellation: string;
    reminder: string;
  };
}
