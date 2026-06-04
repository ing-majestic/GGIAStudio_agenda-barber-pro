import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getDatesRange, formatFriendlyShortDate, getTodayString, parseTimeToMinutes, formatFriendlyDate, isClosedDay } from '../lib/date-utils';
import { getWhatsAppLink } from '../lib/whatsapp-templates';
import { 
  Plus, Search, ShieldAlert, Sparkles, TrendingUp, CheckCircle, Clock, 
  MessageSquare, UserCheck, Scissors, Coffee, Trash2, CalendarClock 
} from 'lucide-react';
import { motion } from 'motion/react';

export const HomeDashboard: React.FC = () => {
  const {
    appointments,
    blockedTimes,
    services,
    settings,
    selectedDate,
    setSelectedDate,
    navigate,
    updateAppointment,
    deleteBlockedTime,
    resetDemoData
  } = useApp();

  const [simulatedTime, setSimulatedTime] = useState<string>('14:15');

  // Generate 7 days for the fast date filter starting from Today
  const dateRange = getDatesRange(getTodayString(), 7);

  // Appointments for the selected date
  const selectedDayAppointments = appointments
    .filter(a => a.date === selectedDate)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  const activeAppts = selectedDayAppointments.filter(a => a.status !== 'Cancelada');

  // Statistics for selected date
  const totalAppointmentsCount = activeAppts.length;
  const completedAppointmentsCount = activeAppts.filter(a => a.status === 'Atendida').length;
  const currentEarnings = activeAppts
    .filter(a => ['Atendida', 'En atención', 'Llegó', 'Confirmada'].includes(a.status))
    .reduce((sum, a) => sum + a.price, 0);

  // Find "Próxima Cita" (Next active appointment today based on simulated hour 14:15)
  // Let's search today's active appointments which are not Atendida or Cancelled or No asistió, and start after simulatedTime minus 30 mins (to capture what's in progress)
  const todayStr = getTodayString();
  const nextAppt = appointments
    .filter(a => a.date === todayStr && !['Atendida', 'Cancelada', 'No asistió'].includes(a.status))
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))
    .find(a => {
      const startMin = parseTimeToMinutes(a.startTime);
      const simMin = parseTimeToMinutes(simulatedTime);
      // Let's capture currently "En atención" or "Llegó" first, or the first upcoming appointment
      if (a.status === 'En atención' || a.status === 'Llegó') return true;
      return startMin + a.duration >= simMin;
    });

  const nextBlocked = blockedTimes
    .filter(b => b.date === todayStr)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))
    .find(b => parseTimeToMinutes(b.endTime) >= parseTimeToMinutes(simulatedTime));

  // Quick state transition handlers for Next Appointment
  const handleQuickStatusChange = (status: any) => {
    if (!nextAppt) return;
    updateAppointment({
      ...nextAppt,
      status: status
    });
  };

  // Perform custom Walk-In (rapid appointment creation)
  const handleWalkIn = () => {
    // Choose a default walk-in service (srv1 - Corte clasico)
    const srv = services[0] || { id: 'srv1', name: 'Corte Clásico', price: 200, duration: 30 };
    const nowHour = simulatedTime;
    const endHour = formatMinutesToTime(parseTimeToMinutes(nowHour) + srv.duration);

    function formatMinutesToTime(minutes: number): string {
      const hours = Math.floor(minutes / 60) % 24;
      const mins = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    const walkInAppt = {
      id: `apt_walk_${Date.now()}`,
      clientId: 'cli_walk',
      clientName: 'Cliente Presencial ⚡',
      clientPhone: '',
      serviceId: srv.id,
      serviceName: srv.name,
      date: todayStr,
      startTime: nowHour,
      endTime: endHour,
      status: 'En atención' as const,
      notes: 'Walk-in / Cliente rápido presencial',
      price: srv.price,
      duration: srv.duration
    };
    updateAppointment(walkInAppt);
    setSelectedDate(todayStr);
  };

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12" id="home-dashboard">
      {/* Header wrapper with simulated clock custom widget */}
      <header className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary tracking-tight">Barber Pro</h1>
          <p className="text-xs text-text-secondary">Agenda & Control Operativo</p>
        </div>
        
        {/* Simulated Time Selector - Keeps user always in control for high demo compatibility */}
        <div className="bg-dark-surface border border-border-dark py-1 px-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
          <Clock className="w-3.5 h-3.5 text-accent-gold" />
          <div className="flex flex-col">
            <span className="text-[9px] text-text-secondary leading-none">Simulado</span>
            <input 
              type="time" 
              value={simulatedTime} 
              onChange={(e) => setSimulatedTime(e.target.value)} 
              className="text-xs font-semibold bg-transparent border-none text-accent-gold focus:outline-none p-0 w-[55px] cursor-pointer"
            />
          </div>
        </div>
      </header>

      {/* Date Horizontal Carousel navigation */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase text-text-secondary mb-3 tracking-widest px-1">Elegir Día</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
          {dateRange.map(date => {
            const isSelected = date === selectedDate;
            const isToday = date === getTodayString();
            const closed = isClosedDay(date, settings.workingDays);
            
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`snap-center flex-shrink-0 flex flex-col items-center justify-center min-w-[58px] py-2.5 rounded-2xl text-center border transition-all duration-300 touch-manipulation ${
                  isSelected
                    ? 'bg-accent-gold border-accent-gold text-dark-bg shadow-lg transform -translate-y-0.5'
                    : 'bg-dark-surface border-border-dark hover:border-text-secondary text-text-secondary'
                }`}
                id={`date-pill-${date}`}
              >
                <span className="text-[10px] font-medium leading-tight">
                  {isToday ? 'Hoy' : formatFriendlyShortDate(date).split(' ')[0]}
                </span>
                <span className="text-lg font-bold font-display leading-tight mt-0.5">
                  {formatFriendlyShortDate(date).split(' ')[1]}
                </span>
                {closed && (
                  <span className={`text-[8px] mt-0.5 px-1 rounded uppercase font-semibold ${isSelected ? 'bg-dark-bg/20 text-dark-bg' : 'bg-danger-red/10 text-danger-red'}`}>
                    Cerrado
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Statistics dashboard box */}
      <section className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-dark-surface border border-border-dark p-3 rounded-2xl flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-4 h-4 text-accent-gold mb-1" />
          <span className="text-[10px] text-text-secondary">Ingresos Hoy</span>
          <span className="text-sm font-bold text-accent-gold mt-0.5">${currentEarnings}</span>
        </div>
        <div className="bg-dark-surface border border-border-dark p-3 rounded-2xl flex flex-col items-center justify-center text-center">
          <CheckCircle className="w-4 h-4 text-success-green mb-1" />
          <span className="text-[10px] text-text-secondary">Atendidos</span>
          <span className="text-sm font-bold text-success-green mt-0.5">
            {completedAppointmentsCount}/{totalAppointmentsCount}
          </span>
        </div>
        <div className="bg-dark-surface border border-border-dark p-3 rounded-2xl flex flex-col items-center justify-center text-center">
          <CalendarClock className="w-4 h-4 text-accent-teal mb-1" />
          <span className="text-[10px] text-text-secondary">Total Hoy</span>
          <span className="text-sm font-bold text-text-primary mt-0.5">{totalAppointmentsCount}</span>
        </div>
      </section>

      {/* Quick Action bar buttons */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase text-text-secondary mb-3 tracking-widest px-1">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('nueva-cita')}
            className="flex items-center gap-3 bg-accent-gold text-dark-bg font-semibold p-3.5 rounded-2xl text-left shadow-lg cursor-pointer transition-all hover:brightness-110 active:scale-95"
            id="action-new"
          >
            <div className="bg-dark-bg/15 p-1 rounded-xl text-dark-bg">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm">Nueva Cita</span>
              <span className="text-[10px] opacity-75 font-normal">Registra al instante</span>
            </div>
          </button>

          <button
            onClick={() => navigate('huecos')}
            className="flex items-center gap-3 bg-dark-surface border border-border-dark font-semibold p-3.5 rounded-2xl text-left cursor-pointer transition-all hover:bg-dark-surface-2 active:scale-95"
            id="action-slots"
          >
            <div className="bg-accent-teal/15 p-1.5 rounded-xl text-accent-teal">
              <Search className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm">Buscar Huecos</span>
              <span className="text-[10px] text-text-secondary font-normal">Para WhatsApp</span>
            </div>
          </button>

          <button
            onClick={() => navigate('bloqueos')}
            className="flex items-center gap-3 bg-dark-surface border border-border-dark font-semibold p-3.5 rounded-2xl text-left cursor-pointer transition-all hover:bg-dark-surface-2 active:scale-95"
            id="action-block"
          >
            <div className="bg-[#EF4444]/10 p-1.5 rounded-xl text-[#EF4444]">
              <Coffee className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm">Bloquear Tiempo</span>
              <span className="text-[10px] text-text-secondary font-normal">Comida o descanso</span>
            </div>
          </button>

          <button
            onClick={handleWalkIn}
            className="flex items-center gap-3 bg-dark-surface border border-accent-teal/40 font-semibold p-3.5 rounded-2xl text-left cursor-pointer transition-all hover:border-accent-teal active:scale-95 text-accent-teal pulse-glow"
            id="action-walk"
          >
            <div className="bg-accent-teal/10 p-1.5 rounded-xl">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Walk-in Rápido</span>
              <span className="text-[10px] text-accent-teal/70 font-normal">Empezar atención ya</span>
            </div>
          </button>
        </div>
      </section>

      {/* "Próxima Actividad" Highlight Board */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase text-text-secondary mb-3 tracking-widest px-1">
          Estado Actual & Próxima Cita
        </h2>
        
        {nextAppt ? (
          <div className="bg-dark-surface border border-accent-gold/40 rounded-2xl p-4 shadow-xl relative overflow-hidden" id="next-appt-card">
            {/* Top tag status */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-accent-gold/10 text-accent-gold text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Siguiente
                </span>
                {nextAppt.status === 'En atención' && (
                  <span className="bg-success-green/15 text-success-green text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                    En Curso ✂️
                  </span>
                )}
                {nextAppt.status === 'Llegó' && (
                  <span className="bg-accent-teal/15 text-accent-teal text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Llegó al local ✔️
                  </span>
                )}
              </div>
              <span className="text-xs text-text-secondary font-mono bg-dark-surface-2 px-2 py-0.5 rounded-md">
                {nextAppt.startTime} - {nextAppt.endTime}
              </span>
            </div>

            {/* Client and service info */}
            <div>
              <h3 className="text-lg font-bold text-text-primary mt-1">{nextAppt.clientName}</h3>
              <p className="text-xs text-accent-gold mt-0.5 flex items-center gap-1">
                <Scissors className="w-3 h-3" /> {nextAppt.serviceName} • ${nextAppt.price} • {nextAppt.duration}m
              </p>
              {nextAppt.notes && (
                <p className="text-xs text-text-secondary mt-2 italic bg-dark-bg/45 p-2 rounded-xl border border-border-dark/30">
                  ⚠️ "{nextAppt.notes}"
                </p>
              )}
            </div>

            {/* Micro transition controls for Barber's speed */}
            <div className="mt-4 pt-4 border-t border-border-dark/60 flex gap-2 justify-between">
              <div className="flex gap-2">
                {nextAppt.status === 'Pendiente' && (
                  <button
                    onClick={() => handleQuickStatusChange('Confirmada')}
                    className="bg-accent-gold/15 hover:bg-accent-gold/25 text-accent-gold text-xs font-semibold py-1.5 px-3 rounded-xl transition"
                  >
                    Confirmar
                  </button>
                )}
                
                {['Pendiente', 'Confirmada'].includes(nextAppt.status) && (
                  <button
                    onClick={() => handleQuickStatusChange('Llegó')}
                    className="bg-accent-teal/15 hover:bg-accent-teal/25 text-accent-teal text-xs font-semibold py-1.5 px-3 rounded-xl transition flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Llegó
                  </button>
                )}

                {nextAppt.status === 'Llegó' && (
                  <button
                    onClick={() => handleQuickStatusChange('En atención')}
                    className="bg-success-green/15 hover:bg-success-green/25 text-success-green text-xs font-bold py-1.5 px-3 rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <Scissors className="w-3.5 h-3.5" /> Iniciar Corte
                  </button>
                )}

                {nextAppt.status === 'En atención' && (
                  <button
                    onClick={() => handleQuickStatusChange('Atendida')}
                    className="bg-success-green text-dark-bg text-xs font-bold py-1.5 px-3 rounded-xl transition hover:brightness-110 flex items-center gap-1"
                  >
                    Concluir Turno ✔️
                  </button>
                )}
              </div>

              {/* WhatsApp direct connector */}
              {nextAppt.clientPhone && (
                <a
                  href={getWhatsAppLink(nextAppt.clientPhone, fillWhatsAppReminder(nextAppt))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-dark-surface-2 hover:bg-border-dark/30 text-text-secondary hover:text-text-primary p-2 rounded-xl border border-border-dark flex items-center justify-center transition"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-4 h-4 text-green-500" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-dark-surface border border-border-dark rounded-2xl p-5 text-center text-text-secondary shadow-md">
            <span className="text-xl">🙌</span>
            <p className="text-sm font-semibold text-text-primary mt-2">Todo al día</p>
            <p className="text-xs text-text-secondary mt-1">No tienes más citas ni bloqueos programados hoy.</p>
          </div>
        )}

        {/* Display next blocked break if active */}
        {nextBlocked && !nextAppt && (
          <div className="mt-3 bg-dark-surface-2 border border-border-dark p-3.5 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="bg-danger-red/10 text-danger-red text-[8px] font-bold px-2 py-0.5 rounded uppercase">
                Bloqueo
              </span>
              <p className="text-sm font-semibold">{nextBlocked.label}</p>
            </div>
            <span className="text-xs text-text-secondary font-mono">
              {nextBlocked.startTime} - {nextBlocked.endTime}
            </span>
          </div>
        )}
      </section>

      {/* Chronological Mini Agenda preview */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3 px-1">
          <h2 className="text-xs font-semibold uppercase text-text-secondary tracking-widest">
            Próximas Actividades ({formatFriendlyDate(selectedDate)})
          </h2>
          <button
            onClick={() => navigate('agenda')}
            className="text-accent-gold text-xs font-semibold hover:underline"
          >
            Ver más
          </button>
        </div>

        {selectedDayAppointments.length > 0 ? (
          <div className="space-y-2.5" id="home-agenda-preview">
            {selectedDayAppointments.map(appt => {
              // Custom color coding based on status
              let statusColor = 'text-warning-amber bg-warning-amber/10';
              if (appt.status === 'Confirmada') statusColor = 'text-info-blue bg-info-blue/10';
              if (appt.status === 'Atendida') statusColor = 'text-success-green bg-success-green/10';
              if (appt.status === 'En atención') statusColor = 'text-success-green bg-success-green/15';
              if (appt.status === 'Cancelada') statusColor = 'text-text-secondary bg-dark-surface-2';
              if (appt.status === 'No asistió') statusColor = 'text-danger-red bg-danger-red/10';

              return (
                <div
                  key={appt.id}
                  onClick={() => navigate('detalle-cita', appt.id)}
                  className={`bg-dark-surface border border-border-dark/60 hover:border-accent-gold p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 transform active:scale-99`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono text-text-secondary min-w-[45px]">
                      {appt.startTime}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-primary leading-tight">
                        {appt.clientName}
                      </span>
                      <span className="text-[11px] text-text-secondary leading-normal flex items-center gap-1.5 mt-0.5">
                        <span 
                          className="w-1.5 h-1.5 rounded-full inline-block" 
                          style={{ backgroundColor: services.find(s => s.id === appt.serviceId)?.color || '#C89B3C' }} 
                        />
                        {appt.serviceName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColor}`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-dark-surface border border-border-dark/60 p-6 rounded-2xl text-center text-text-secondary">
            <CalendarClock className="w-8 h-8 mx-auto text-text-secondary/40 stroke-[1.5] mb-2" />
            <p className="text-xs">No hay citas registradas para este día.</p>
            {!isClosedDay(selectedDate, settings.workingDays) && (
              <button
                onClick={() => navigate('nueva-cita')}
                className="text-accent-gold font-medium xs text-xs mt-2 hover:underline"
              >
                + Crear primera cita
              </button>
            )}
          </div>
        )}
      </section>

      {/* Reset Demo button at bottom - keeps demo interface self-reparable and highly practical */}
      <footer className="text-center pt-4 border-t border-border-dark/40">
        <button
          onClick={() => {
            if (confirm('¿Restablecer todos los datos de muestra a valores predeterminados?')) {
              resetDemoData();
            }
          }}
          className="text-[10px] text-text-secondary/65 hover:text-danger-red transition-all cursor-pointer inline-flex items-center gap-1 bg-dark-surface/30 p-1.5 rounded-lg border border-border-dark/20"
        >
          <Trash2 className="w-3 h-3" /> Restablecer demostración
        </button>
      </footer>
    </div>
  );
};

// Simple templates filling utilities embedded to avoid side effects
function fillWhatsAppReminder(appt: any): string {
  return `Qué tal ${appt.clientName} 👋 Te recuerdo tu cita de hoy a las ${appt.startTime} para ${appt.serviceName}. ¡Nos vemos en un rato! 💈`;
}
