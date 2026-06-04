import { repository } from './mock-repository';
import { parseTimeToMinutes, formatMinutesToTime, isClosedDay } from './date-utils';
import { Service, Appointment, BlockedTime } from '../types';

export interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
  reason?: 'closed' | 'taken' | 'blocked' | 'buffer';
  overlapWith?: {
    type: 'appointment' | 'blocked';
    id: string;
    label: string;
  };
}

/**
 * Calculates all potential 15-minute start slots for a date and highlights if they are bookable index
 */
export function getAvailabilityForDate(dateStr: string, serviceToBook?: Service): TimeSlot[] {
  const settings = repository.getSettings();
  
  // 1. Is it a working day?
  if (isClosedDay(dateStr, settings.workingDays)) {
    return []; // closed
  }

  const appointments = repository.getAppointments().filter(
    a => a.date === dateStr && a.status !== 'Cancelada'
  );
  const blockedTimes = repository.getBlockedTimes().filter(
    b => b.date === dateStr
  );

  const startMinutes = parseTimeToMinutes(settings.openTime);
  const endMinutes = parseTimeToMinutes(settings.closeTime);
  const durationNeeded = serviceToBook ? serviceToBook.duration : 30; // default to 30 mins
  
  const slots: TimeSlot[] = [];

  // Generate slots in 15 minute increments
  for (let m = startMinutes; m + durationNeeded <= endMinutes; m += 15) {
    const slotTimeStr = formatMinutesToTime(m);
    const slotEndMinutes = m + durationNeeded;
    const slotEndTimeStr = formatMinutesToTime(slotEndMinutes);

    let isAvailable = true;
    let reason: 'closed' | 'taken' | 'blocked' | 'buffer' | undefined;
    let overlapWith: { type: 'appointment' | 'blocked'; id: string; label: string } | undefined;

    // Check overlap with appointments
    for (const appt of appointments) {
      const apptStartMin = parseTimeToMinutes(appt.startTime);
      const apptEndMin = parseTimeToMinutes(appt.endTime);
      
      // Calculate buffer window occupied after the appointment
      const serviceObj = repository.getServices().find(s => s.id === appt.serviceId);
      const buffer = serviceObj ? serviceObj.buffer : settings.defaultBuffer;
      const apptEndWithBufferMin = apptEndMin + buffer;

      // Overlap calculation: 
      // A candidate slot starting at `m` and ending at `slotEndMinutes` overlaps with the occupied slot 
      // [apptStartMin, apptEndWithBufferMin] if:
      if (m < apptEndWithBufferMin && slotEndMinutes > apptStartMin) {
        isAvailable = false;
        overlapWith = {
          type: 'appointment',
          id: appt.id,
          label: `${appt.clientName} (${appt.serviceName})`
        };
        // distinguishes between actual appointment duration vs buffer overlap
        reason = m < apptEndMin ? 'taken' : 'buffer';
        break;
      }
    }

    // Check overlap with blocked times (if not already taken)
    if (isAvailable) {
      for (const block of blockedTimes) {
        const blockStartMin = parseTimeToMinutes(block.startTime);
        const blockEndMin = parseTimeToMinutes(block.endTime);

        if (m < blockEndMin && slotEndMinutes > blockStartMin) {
          isAvailable = false;
          overlapWith = {
            type: 'blocked',
            id: block.id,
            label: block.label
          };
          reason = 'blocked';
          break;
        }
      }
    }

    slots.push({
      time: slotTimeStr,
      available: isAvailable,
      reason,
      overlapWith
    });
  }

  return slots;
}

/**
 * Searches and returns up to 4 best, distributed free slots for copy-pasting
 */
export function getRecommendedSlots(dateStr: string, service: Service): string[] {
  const allSlots = getAvailabilityForDate(dateStr, service);
  const freeSlots = allSlots.filter(s => s.available).map(s => s.time);

  if (freeSlots.length <= 4) {
    return freeSlots;
  }

  // Pick distributed slots: early (afternoon), mid-afternoon, evening, late
  // Or pick first 4, but distributing is elegant. Let's do a smart distribution:
  const suggested: string[] = [];
  
  // Morning/Midday slots: 12:00 - 15:00
  const early = freeSlots.find(t => parseTimeToMinutes(t) < 900); // before 15:00
  if (early) suggested.push(early);

  // Afternoon slots: 15:00 - 18:00
  const mid = freeSlots.find(t => {
    const min = parseTimeToMinutes(t);
    return min >= 900 && min < 1080 && !suggested.includes(t);
  });
  if (mid) suggested.push(mid);

  // Late afternoon / early evening slots: 18:00 - 20:30
  const evening = freeSlots.find(t => {
    const min = parseTimeToMinutes(t);
    return min >= 1080 && min < 1230 && !suggested.includes(t);
  });
  if (evening) suggested.push(evening);

  // Night slots: 20:30 onwards
  const late = freeSlots.find(t => {
    const min = parseTimeToMinutes(t);
    return min >= 1230 && !suggested.includes(t);
  });
  if (late) suggested.push(late);

  // Fallback if we didn't fill 4 but have free slots: fill up with what's available
  for (const slot of freeSlots) {
    if (suggested.length >= 4) break;
    if (!suggested.includes(slot)) {
      suggested.push(slot);
    }
  }

  // Let's sort suggestions chronologically
  return suggested.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

/**
 * Checks if a proposed appointment startTime and service duration overlaps with any existing booked range
 */
export function countCollisions(
  dateStr: string,
  startTime: string,
  durationMinutes: number,
  excludeAppointmentId?: string
): { type: 'appointment' | 'blocked'; label: string }[] {
  const appointments = repository.getAppointments().filter(
    a => a.date === dateStr && a.status !== 'Cancelada' && a.id !== excludeAppointmentId
  );
  const blockedTimes = repository.getBlockedTimes().filter(
    b => b.date === dateStr
  );

  const startMin = parseTimeToMinutes(startTime);
  const endMin = startMin + durationMinutes;
  const collisions: { type: 'appointment' | 'blocked'; label: string }[] = [];

  for (const appt of appointments) {
    const apptStart = parseTimeToMinutes(appt.startTime);
    const apptEnd = parseTimeToMinutes(appt.endTime);
    // Include the service buffer for accurate collision checking
    const srv = repository.getServices().find(s => s.id === appt.serviceId);
    const buffer = srv ? srv.buffer : 5;
    const apptEndWithBuffer = apptEnd + buffer;

    // Overlap condition
    if (startMin < apptEndWithBuffer && endMin > apptStart) {
      collisions.push({
        type: 'appointment',
        label: `${appt.clientName} (${appt.startTime} - ${appt.endTime} + ${buffer}m buffer)`
      });
    }
  }

  for (const block of blockedTimes) {
    const bStart = parseTimeToMinutes(block.startTime);
    const bEnd = parseTimeToMinutes(block.endTime);

    // Overlap condition
    if (startMin < bEnd && endMin > bStart) {
      collisions.push({
        type: 'blocked',
        label: `Bloqueo: ${block.label} (${block.startTime} - ${block.endTime})`
      });
    }
  }

  return collisions;
}
