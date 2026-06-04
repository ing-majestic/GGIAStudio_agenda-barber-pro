/**
 * Utility functions for date and time calculations
 */

/**
 * Returns today's date as YYYY-MM-DD using the user's local timezone.
 * Compatible with Mexico/CDMX (America/Mexico_City) and any other locale.
 */
export function getTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function addMinutesToTime(timeStr: string, minutes: number): string {
  const currentMinutes = parseTimeToMinutes(timeStr);
  return formatMinutesToTime(currentMinutes + minutes);
}

export function getDayOfWeek(dateStr: string): number {
  // dateStr is YYYY-MM-DD
  const date = new Date(dateStr + 'T00:00:00');
  return date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

const DAYS_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function formatFriendlyDate(dateStr: string): string {
  if (dateStr === getTodayString()) {
    return 'Hoy';
  }
  const tomorrow = addDays(getTodayString(), 1);
  if (dateStr === tomorrow) {
    return 'Mañana';
  }

  const date = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_NAMES[date.getDay()];
  const dayNumber = date.getDate();
  const monthName = MONTHS_NAMES[date.getMonth()];
  return `${dayName}, ${dayNumber} de ${monthName}`;
}

export function formatFriendlyShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_NAMES[date.getDay()].substring(0, 3);
  const dayNumber = date.getDate();
  return `${dayName} ${dayNumber}`;
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDatesRange(startDateStr: string, count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(addDays(startDateStr, i));
  }
  return dates;
}

export function isClosedDay(dateStr: string, workingDays: number[]): boolean {
  const day = getDayOfWeek(dateStr);
  return !workingDays.includes(day);
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const minStartA = parseTimeToMinutes(startA);
  const minEndA = parseTimeToMinutes(endA);
  const minStartB = parseTimeToMinutes(startB);
  const minEndB = parseTimeToMinutes(endB);
  
  return minStartA < minEndB && minStartB < minEndA;
}
