import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatFriendlyDate, parseTimeToMinutes, isClosedDay } from '../lib/date-utils';
import { getAvailabilityForDate } from '../lib/availability-engine';
import { 
  ArrowLeft, Calendar, User, Scissors, ToggleLeft, ToggleRight, 
  Plus, CheckSquare, Settings, AlertTriangle, Coffee, MessageSquare, Phone
} from 'lucide-react';
import { getWhatsAppLink } from '../lib/whatsapp-templates';

export const AgendaList: React.FC = () => {
  const {
    appointments,
    blockedTimes,
    services,
    settings,
    selectedDate,
    setSelectedDate,
    navigate
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Load appointments for selectedDate
  const allDayAppointments = appointments
    .filter(a => a.date === selectedDate)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  // Load blocked times for selectedDate
  const dayBlockedTimes = blockedTimes
    .filter(b => b.date === selectedDate)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  // Determine availability timelines
  const activeTimelineSlots = getAvailabilityForDate(selectedDate);
  const freeSlotsOnly = activeTimelineSlots.filter(s => s.available);

  // Filter appointments if requested
  const filteredAppointments = allDayAppointments.filter(appt => {
    if (filterStatus === 'todos') return true;
    if (filterStatus === 'pendientes') return appt.status === 'Pendiente' || appt.status === 'Confirmada';
    if (filterStatus === 'atendidos') return appt.status === 'Atendida';
    if (filterStatus === 'inasistencias') return appt.status === 'No asistió';
    return true;
  });

  const isClosed = isClosedDay(selectedDate, settings.workingDays);

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12" id="agenda-view">
      {/* Top navigation header */}
      <header className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('home')}
            className="p-1 px-2 rounded-xl text-text-secondary hover:text-text-primary bg-dark-surface/40 hover:bg-dark-surface cursor-pointer"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold font-display ml-1">Agenda Barber Pro</h1>
        </div>
        <button
          onClick={() => navigate('nueva-cita')}
          className="bg-accent-gold text-dark-bg p-2 rounded-full font-bold shadow-md hover:brightness-110 active:scale-95 flex items-center justify-center cursor-pointer"
          title="Nueva Cita"
          id="agenda-create-btn"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </header>

      {/* Title block with date */}
      <div className="mb-4 bg-dark-surface/60 border border-border-dark p-3.5 rounded-2xl flex justify-between items-center">
        <div>
          <span className="text-xs text-text-secondary">Fecha Seleccionada:</span>
          <p className="text-sm font-bold text-accent-gold mt-0.5">{formatFriendlyDate(selectedDate)}</p>
        </div>
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-dark-surface-2 border border-border-dark text-xs text-text-primary p-2 rounded-xl focus:outline-none focus:border-accent-gold cursor-pointer"
          />
        </div>
      </div>

      {/* Filter Tabs layout */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-none">
        {['todos', 'pendientes', 'atendidos', 'inasistencias'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full capitalize border transition active:scale-95 ${
              filterStatus === tab
                ? 'bg-accent-teal/15 text-accent-teal border-accent-teal/40 font-semibold'
                : 'bg-dark-surface border-border-dark text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Agenda list layout */}
      <section className="space-y-4">
        {isClosed ? (
          <div className="bg-dark-surface border border-danger-red/20 rounded-2xl p-6 text-center text-text-secondary">
            <AlertTriangle className="w-9 h-9 mx-auto text-danger-red/60 mb-2" />
            <h3 className="text-sm font-bold text-text-primary">Barbería Cerrada</h3>
            <p className="text-xs mt-1 text-text-secondary/80">Este día corresponde a tu descanso programado de la semana.</p>
            <button
              onClick={() => navigate('config')}
              className="text-accent-gold text-xs font-semibold mt-3 hover:underline"
            >
              Cambiar días laborales en ajustes →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. BLOCKS AND APPOINTMENTS CHRONOLOGICAL LIST */}
            <h2 className="text-xs font-semibold uppercase text-text-secondary tracking-widest pl-1 mb-2">Citas & Bloqueos</h2>
            
            {filteredAppointments.length === 0 && dayBlockedTimes.length === 0 ? (
              <div className="bg-dark-surface border border-border-dark p-6 rounded-2xl text-center text-text-secondary">
                <p className="text-xs">Sin actividades registradas para este filtro o día.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Mix and sort appointments and blocked items chronologically */}
                {[
                  ...filteredAppointments.map(a => ({ type: 'appt' as const, time: a.startTime, data: a })),
                  ...dayBlockedTimes.map(b => ({ type: 'block' as const, time: b.startTime, data: b }))
                ]
                  .sort((x, y) => parseTimeToMinutes(x.time) - parseTimeToMinutes(y.time))
                  .map((item, index) => {
                    if (item.type === 'block') {
                      const block = item.data;
                      return (
                        <div
                          key={`block-${block.id}-${index}`}
                          className="bg-dark-surface-2/60 border border-dashed border-danger-red/30 p-3 rounded-2xl flex justify-between items-center"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold font-mono text-danger-red bg-danger-red/10 px-2 py-0.5 rounded">
                              {block.startTime} - {block.endTime}
                            </span>
                            <div className="flex items-center gap-2">
                              <Coffee className="w-4 h-4 text-danger-red" />
                              <span className="text-sm font-semibold text-text-primary">{block.label}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-text-secondary italic">Tiempo ocupado</span>
                        </div>
                      );
                    } else {
                      const appt = item.data as any;
                      const srv = services.find(s => s.id === appt.serviceId);
                      
                      // Status colors
                      let statusBadgeClass = 'text-warning-amber bg-warning-amber/10';
                      if (appt.status === 'Confirmada') statusBadgeClass = 'text-info-blue bg-info-blue/10';
                      if (appt.status === 'Atendida') statusBadgeClass = 'text-success-green bg-success-green/10';
                      if (appt.status === 'En atención') statusBadgeClass = 'text-success-green bg-success-green/15 border border-success-green/20';
                      if (appt.status === 'Cancelada') statusBadgeClass = 'text-text-secondary bg-dark-surface-2';
                      if (appt.status === 'No asistió') statusBadgeClass = 'text-danger-red bg-danger-red/10';

                      return (
                        <div
                          key={`appt-${appt.id}`}
                          onClick={() => navigate('detalle-cita', appt.id)}
                          className="bg-dark-surface border border-border-dark/60 hover:border-accent-gold p-3.5 rounded-2xl flex flex-col cursor-pointer transition-all duration-300"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold font-mono text-text-primary">
                                {appt.startTime}
                              </span>
                              <span className="text-xs text-text-secondary font-mono">
                                ({appt.duration} min)
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusBadgeClass}`}>
                              {appt.status}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-sm font-bold text-text-primary">{appt.clientName}</h3>
                              <p className="text-xs text-accent-gold mt-0.5 flex items-center gap-1">
                                <span 
                                  className="w-1.5 h-1.5 rounded-full inline-block" 
                                  style={{ backgroundColor: srv?.color || '#C89B3C' }} 
                                />
                                {appt.serviceName} • m${appt.price}
                              </p>
                            </div>

                            <div className="flex gap-1.5">
                              {appt.clientPhone && (
                                <a
                                  href={`tel:${appt.clientPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 bg-dark-surface-2 rounded-lg text-text-secondary hover:text-text-primary border border-border-dark/50"
                                  title="Llamar"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {appt.clientPhone && (
                                <a
                                  href={getWhatsAppLink(appt.clientPhone, fillWhatsAppReminder(appt))}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 bg-dark-surface-2 rounded-lg text-text-secondary hover:text-green-500 border border-border-dark/50"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
              </div>
            )}

            {/* 2. FREE SLOTS VISUALIZER DIRECTLY TO NAVEGACIÓN */}
            <div className="pt-4">
              <h2 className="text-xs font-semibold uppercase text-text-secondary tracking-widest pl-1 mb-3">Huecos Libres Rápidos</h2>
              {freeSlotsOnly.length === 0 ? (
                <div className="bg-dark-surface border border-dashed border-border-dark p-4 rounded-2xl text-center text-text-secondary text-xs">
                  ⚠️ No hay huecos libres hoy. ¡Agenda completamente llena!
                </div>
              ) : (
                <div className="bg-dark-surface border border-border-dark p-3.5 rounded-2xl">
                  <p className="text-[11px] text-text-secondary mb-3">Toca cualquier hora para crear cita en ese horario exacto:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {freeSlotsOnly.slice(0, 12).map((slot, index) => (
                      <button
                        key={`avail-${slot.time}-${index}`}
                        onClick={() => {
                          // Go to Nueva Cita with preselected slot
                          // We pass the time via local state or URL? We can just pass via repository or simple variables!
                          // Let's store are preselected state directly in the localStorage or session state
                          localStorage.setItem('barber_preselected_time', slot.time);
                          navigate('nueva-cita');
                        }}
                        className="bg-dark-surface-2 hover:bg-accent-gold/15 border border-border-dark hover:border-accent-gold text-xs font-bold font-mono py-2 rounded-xl text-center transition cursor-pointer text-accent-gold"
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  {freeSlotsOnly.length > 12 && (
                    <p className="text-[10px] text-text-secondary/65 text-center mt-2">Y {freeSlotsOnly.length - 12} horarios libres más.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

function fillWhatsAppReminder(appt: any): string {
  return `💈 Qué tal ${appt.clientName}! Te saludo de Barbería Don Corleone. Recuerda tu cita hoy a las ${appt.startTime} hs para ${appt.serviceName}. ¡Nos vemos listo! 🔥`;
}
