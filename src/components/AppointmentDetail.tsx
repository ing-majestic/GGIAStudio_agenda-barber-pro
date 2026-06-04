import React, { useState, useEffect } from 'react';
import { useApp, AppView } from '../context/AppContext';
import { repository } from '../lib/mock-repository';
import { fillTemplate, getWhatsAppLink } from '../lib/whatsapp-templates';
import { formatFriendlyDate, addMinutesToTime } from '../lib/date-utils';
import { countCollisions } from '../lib/availability-engine';
import { 
  ArrowLeft, Scissors, Calendar, User, MessageCircle, Copy, Check, 
  Trash2, RefreshCw, Smartphone, PhoneCall, AlertCircle, AlertTriangle 
} from 'lucide-react';

export const AppointmentDetail: React.FC = () => {
  const {
    selectedAppointmentId,
    appointments,
    services,
    settings,
    navigate,
    goBack,
    updateAppointment,
    deleteAppointment
  } = useApp();

  const appt = appointments.find(a => a.id === selectedAppointmentId);

  const [dateField, setDateField] = useState<string>('');
  const [timeField, setTimeField] = useState<string>('');
  const [notesField, setNotesField] = useState<string>('');
  
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isReprogramming, setIsReprogramming] = useState<boolean>(false);
  const [collisions, setCollisions] = useState<{ type: string; label: string }[]>([]);

  useEffect(() => {
    if (appt) {
      setDateField(appt.date);
      setTimeField(appt.startTime);
      setNotesField(appt.notes || '');
    }
  }, [appt]);

  // Track collision warnings upon reprogram time adjustments
  useEffect(() => {
    if (!appt || !dateField || !timeField) return;
    const items = countCollisions(dateField, timeField, appt.duration, appt.id);
    setCollisions(items);
  }, [dateField, timeField, appt]);

  if (!appt) {
    return (
      <div className="p-6 text-center text-text-secondary h-full flex flex-col justify-center items-center">
        <AlertCircle className="w-12 h-12 text-danger-red/60 mb-2" />
        <p>No se seleccionó ninguna cita o no existe.</p>
        <button onClick={() => navigate('home')} className="mt-3 bg-accent-gold text-dark-bg px-4 py-2 rounded-xl text-xs font-bold">
          Volver al Inicio
        </button>
      </div>
    );
  }

  const srv = services.find(s => s.id === appt.serviceId);

  // Status Chip options
  const statusOptions: any[] = [
    { label: 'Confirmada', color: 'bg-info-blue/15 text-info-blue border-info-blue/40' },
    { label: 'Pendiente', color: 'bg-warning-amber/15 text-warning-amber border-warning-amber/40' },
    { label: 'Llegó', color: 'bg-accent-teal/15 text-accent-teal border-accent-teal/40' },
    { label: 'En atención', color: 'bg-success-green/15 text-success-green border-success-green/45' },
    { label: 'Atendida', color: 'bg-success-green text-dark-bg border-success-green' },
    { label: 'Cancelada', color: 'bg-dark-surface-2 text-text-secondary border-border-dark' },
    { label: 'No asistió', color: 'bg-danger-red/15 text-danger-red border-danger-red/40' }
  ];

  const handleStatusSelect = (statusName: any) => {
    const updated = { ...appt, status: statusName };
    updateAppointment(updated);
  };

  const handleReprogram = () => {
    const srvItem = services.find(s => s.id === appt.serviceId);
    const duration = srvItem ? srvItem.duration : appt.duration;
    const finalEndTime = addMinutesToTime(timeField, duration);

    const updated = {
      ...appt,
      date: dateField,
      startTime: timeField,
      endTime: finalEndTime,
      notes: notesField,
      status: 'Confirmada' as const // auto re-confirms when reprogrammed
    };

    updateAppointment(updated);
    setIsReprogramming(false);

    // copy template copyer feedback automatically
    triggerCopyNotification('reprogram_msg');
  };

  const triggerCopyNotification = (key: string) => {
    let rawText = '';
    const temp = settings.whatsappTemplates;

    if (key === 'confirmation') {
      rawText = fillTemplate(temp.confirmation, {
        cliente: appt.clientName,
        fecha: formatFriendlyDate(appt.date),
        hora: appt.startTime,
        servicio: appt.serviceName
      });
    } else if (key === 'reschedule') {
      rawText = fillTemplate(temp.reschedule, {
        cliente: appt.clientName,
        fecha: formatFriendlyDate(dateField),
        hora: timeField,
        servicio: appt.serviceName
      });
    } else if (key === 'cancellation') {
      rawText = fillTemplate(temp.cancellation, {
        cliente: appt.clientName,
        fecha: formatFriendlyDate(appt.date),
        hora: appt.startTime,
        servicio: appt.serviceName
      });
    } else if (key === 'reminder') {
      rawText = fillTemplate(temp.reminder, {
        cliente: appt.clientName,
        fecha: formatFriendlyDate(appt.date),
        hora: appt.startTime,
        servicio: appt.serviceName
      });
    }

    if (rawText) {
      navigator.clipboard.writeText(rawText);
      setCopiedType(key);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleCancelClick = () => {
    if (confirm('¿Marcar cita como CANCELADA? Se liberará el espacio en la agenda inmediatamente.')) {
      handleStatusSelect('Cancelada');
    }
  };

  const handleDeleteClick = () => {
    if (confirm('¿ELIMINAR defitivamente este turno del historial de la base de datos?')) {
      deleteAppointment(appt.id);
      goBack();
    }
  };

  // Status specific classes
  let activeStatusHighlight = 'border-accent-gold/40';
  if (appt.status === 'Cancelada') activeStatusHighlight = 'border-dashed border-danger-red/35 opacity-70';
  if (appt.status === 'Atendida') activeStatusHighlight = 'border-success-green/45 bg-[#14231b]';

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12" id="appt-detail-view">
      {/* Header navigations */}
      <header className="flex justify-between items-center mb-5">
        <button
          onClick={goBack}
          className="p-1 px-2 rounded-xl text-text-secondary hover:text-text-primary bg-dark-surface/40 hover:bg-dark-surface cursor-pointer"
        >
          ← Volver
        </button>
        <span className="text-xs text-text-secondary font-mono bg-dark-surface p-1 px-2.5 rounded-lg border border-border-dark">ID: {appt.id}</span>
      </header>

      {/* Main detail card displays */}
      <section className={`bg-dark-surface border p-4 rounded-2xl shadow-xl space-y-4 mb-5 ${activeStatusHighlight}`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold font-display tracking-tight text-text-primary">{appt.clientName}</h2>
            {appt.clientPhone ? (
              <a href={`tel:${appt.clientPhone}`} className="text-xs text-accent-teal hover:underline flex items-center gap-1 mt-0.5">
                📞 {appt.clientPhone} (Llamar)
              </a>
            ) : (
              <span className="text-[10px] text-text-secondary italic">Sin teléfono registrado</span>
            )}
          </div>
          <span className="text-xs font-mono bg-dark-surface-2 p-1.5 px-3 rounded-xl border border-border-dark">
            {appt.startTime} - {appt.endTime}
          </span>
        </div>

        {/* Technical/Service specs */}
        <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-border-dark/60">
          <div>
            <span className="text-[10px] text-text-secondary uppercase">Servicio</span>
            <p className="text-sm font-semibold flex items-center gap-1.5 mt-0.5">
              <span 
                className="w-2 h-2 rounded-full inline-block" 
                style={{ backgroundColor: srv?.color || '#C89B3C' }} 
              />
              {appt.serviceName}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase">Monto</span>
            <p className="text-sm font-bold text-accent-gold mt-0.5">${appt.price} MXN</p>
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase">Fecha</span>
            <p className="text-sm font-semibold text-text-primary mt-0.5">{formatFriendlyDate(appt.date)}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase">Estado Cita</span>
            <p className="text-sm font-bold text-accent-teal mt-0.5">{appt.status}</p>
          </div>
        </div>

        {/* Existing note segment */}
        {appt.notes && (
          <div className="p-3 bg-dark-surface-2 border border-border-dark/50 rounded-xl">
            <span className="text-[10px] text-text-secondary uppercase">Nota operativa:</span>
            <p className="text-xs italic text-text-primary mt-1">"{appt.notes}"</p>
          </div>
        )}
      </section>

      {/* QUICK STATUS MODIFIER CHIPS */}
      <section className="bg-dark-surface border border-border-dark p-4 rounded-2xl mb-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase text-text-secondary tracking-widest">
          Modificar Estado en 1 Toque
        </h3>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map(opt => {
            const isSelected = appt.status === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => handleStatusSelect(opt.label)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer select-none transition ${
                  isSelected 
                    ? `${opt.color} scale-105 shadow-inner border-2`
                    : 'bg-dark-surface-2 border-border-dark/60 text-text-secondary hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* REPROGRAMMING / MOVE DRAWER ACCORDION */}
      <section className="bg-dark-surface border border-border-dark p-4 rounded-2xl mb-5">
        <button
          onClick={() => setIsReprogramming(!isReprogramming)}
          className="w-full flex justify-between items-center text-left text-xs font-semibold uppercase text-text-secondary tracking-widest cursor-pointer"
        >
          <span>{isReprogramming ? '▾ Cancelar Cambio' : '▸ Re-programar / Mover Cita'}</span>
          <span className="text-xs text-accent-gold underline">Ajustar Hora</span>
        </button>

        {isReprogramming && (
          <div className="space-y-4 mt-4 pt-4 border-t border-border-dark/60">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-text-secondary mb-1 block uppercase">Fecha nueva</label>
                <input
                  type="date"
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value)}
                  className="w-full bg-dark-surface-2 border border-border-dark text-xs p-2.5 rounded-xl text-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary mb-1 block uppercase">Hora nueva</label>
                <input
                  type="time"
                  value={timeField}
                  onChange={(e) => setTimeField(e.target.value)}
                  className="w-full bg-dark-surface-2 border border-border-dark text-xs p-2.5 rounded-xl text-text-primary text-center focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-text-secondary mb-1 block uppercase">Editar notas o razón del cambio</label>
              <input
                type="text"
                placeholder="Ej. Cambio solicitado por el cliente"
                value={notesField}
                onChange={(e) => setNotesField(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark text-xs p-2.5 rounded-xl text-text-primary"
              />
            </div>

            {/* Collision warning in Rescheduler */}
            {collisions.length > 0 && (
              <div className="bg-warning-amber/10 border border-warning-amber/30 p-3 rounded-xl flex gap-2 text-warning-amber">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                <div className="text-[10px]">
                  <p className="font-bold">Colisión identificada:</p>
                  <p className="mt-0.5">Se empalma con: {collisions.map(c => c.label).join(', ')}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleReprogram}
              className="w-full bg-accent-teal text-dark-bg font-bold p-2.5 rounded-xl text-xs hover:brightness-110"
            >
              Confirmar Cambio & Copiar Aviso
            </button>
          </div>
        )}
      </section>

      {/* WHATSAPP MANUAL TEMPLATE SHARING COPIERS -- satisfaction of quick copies */}
      {appt.clientPhone && (
        <section className="bg-dark-surface border border-border-dark p-4 rounded-2xl mb-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase text-text-secondary tracking-widest pl-1">
            Plantillas Rápidas para WhatsApp
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {/* Template Option: Recordatorio */}
            <button
              onClick={() => triggerCopyNotification('reminder')}
              className="bg-dark-surface-2 hover:bg-dark-surface-2/80 border border-border-dark p-2.5 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer select-none relative"
            >
              <Smartphone className="w-4 h-4 text-accent-gold mb-1" />
              <span className="text-[10px] font-semibold text-text-primary">Recordatorio Hoy</span>
              <span className="text-[9px] text-text-secondary mt-0.5">Toca para Copiar</span>
              {copiedType === 'reminder' && (
                <span className="absolute inset-0 bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold rounded-xl animate-fade-in">
                  ✓ Copiado
                </span>
              )}
            </button>

            {/* Template Option: Confirmación */}
            <button
              onClick={() => triggerCopyNotification('confirmation')}
              className="bg-dark-surface-2 hover:bg-dark-surface-2/80 border border-border-dark p-2.5 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer select-none relative"
            >
              <Check className="w-4 h-4 text-green-400 mb-1" />
              <span className="text-[10px] font-semibold text-text-primary">Confirmación Cita</span>
              <span className="text-[9px] text-text-secondary mt-0.5">Toca para Copiar</span>
              {copiedType === 'confirmation' && (
                <span className="absolute inset-0 bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold rounded-xl animate-fade-in">
                  ✓ Copiado
                </span>
              )}
            </button>

            {/* Template Option: Reprogramación */}
            <button
              onClick={() => triggerCopyNotification('reschedule')}
              className="bg-dark-surface-2 hover:bg-dark-surface-2/80 border border-border-dark p-2.5 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer select-none relative"
            >
              <RefreshCw className="w-4 h-4 text-info-blue mb-1" />
              <span className="text-[10px] font-semibold text-text-primary">Re-programación</span>
              <span className="text-[9px] text-text-secondary mt-0.5">Toca para Copiar</span>
              {copiedType === 'reschedule' && (
                <span className="absolute inset-0 bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold rounded-xl animate-fade-in">
                  ✓ Copiado
                </span>
              )}
            </button>

            {/* Template Option: Cancelación */}
            <button
              onClick={() => triggerCopyNotification('cancellation')}
              className="bg-dark-surface-2 hover:bg-dark-surface-2/80 border border-border-dark p-2.5 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer select-none relative"
            >
              <Trash2 className="w-4 h-4 text-red-400 mb-1" />
              <span className="text-[10px] font-semibold text-text-primary font-sans">Aviso Cancelación</span>
              <span className="text-[9px] text-text-secondary mt-0.5">Toca para Copiar</span>
              {copiedType === 'cancellation' && (
                <span className="absolute inset-0 bg-danger-red text-white flex items-center justify-center text-[10px] font-bold rounded-xl animate-fade-in">
                  ✓ Copiado
                </span>
              )}
            </button>
          </div>
          
          <a
            href={getWhatsAppLink(appt.clientPhone, `Hola ${appt.clientName}! 💈 Te escribo de Barbería Pro...`)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#20ba56] text-white font-bold py-3.5 px-4 rounded-xl text-center flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <MessageCircle className="w-4.5 h-4.5 fill-white stroke-none" /> Chatear en WhatsApp
          </a>
        </section>
      )}

      {/* DESTRUCTIVE ACTION BUTTONS */}
      <section className="flex gap-2 mb-8">
        <button
          onClick={handleCancelClick}
          className="flex-1 bg-danger-red/10 border border-danger-red/30 hover:bg-danger-red/20 text-danger-red text-center py-2.5 rounded-xl font-bold text-xs"
        >
          Cancelar Cita 🚫
        </button>
        <button
          onClick={handleDeleteClick}
          className="flex-1 bg-dark-surface hover:bg-dark-surface-2 border border-border-dark text-text-secondary hover:text-text-primary text-center py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" /> Eliminar Registro
        </button>
      </section>
    </div>
  );
};
