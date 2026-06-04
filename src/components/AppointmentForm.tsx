import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { countCollisions } from '../lib/availability-engine';
import { repository } from '../lib/mock-repository';
import { fillTemplate, getWhatsAppLink } from '../lib/whatsapp-templates';
import { addMinutesToTime, formatFriendlyDate, getTodayString } from '../lib/date-utils';
import { Appointment } from '../types';
import {
  Users, Scissors, Calendar, Clock, AlertTriangle, Check, BookOpen,
  ChevronRight, Sparkles, Send, Copy, MessageCircle, X, Search
} from 'lucide-react';

export const AppointmentForm: React.FC = () => {
  const {
    services,
    clients,
    settings,
    selectedDate,
    navigate,
    addAppointment
  } = useApp();

  const [clientMode, setClientMode] = useState<'create' | 'select'>('create');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [apptDate, setApptDate] = useState<string>(selectedDate);
  const [startTime, setStartTime] = useState<string>('15:00');
  const [notes, setNotes] = useState<string>('');

  // Collision state
  const [collisions, setCollisions] = useState<{ type: string; label: string }[]>([]);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedApptText, setSavedApptText] = useState<string>('');
  const [savedPhone, setSavedPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Overbook modal state
  const [showOverbookModal, setShowOverbookModal] = useState<boolean>(false);
  const [pendingAppt, setPendingAppt] = useState<Appointment | null>(null);

  // Check if there was a pre-selected time from another panel (e.g., Agenda list click)
  useEffect(() => {
    const preselected = localStorage.getItem('barber_preselected_time');
    if (preselected) {
      setStartTime(preselected);
      localStorage.removeItem('barber_preselected_time');
    }
  }, []);

  // Update default service selection
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [services]);

  const activeService = services.find(s => s.id === selectedServiceId) || services[0];
  const activeDuration = activeService ? activeService.duration : 30;
  const activePrice = activeService ? activeService.price : 200;

  // Track collisions reactively as user builds the form
  useEffect(() => {
    if (!apptDate || !startTime || !activeDuration) return;
    const items = countCollisions(apptDate, startTime, activeDuration);
    setCollisions(items);
  }, [apptDate, startTime, selectedServiceId]);

  // Load client defaults if selected
  useEffect(() => {
    if (clientMode === 'select' && selectedClientId) {
      const cli = clients.find(c => c.id === selectedClientId);
      if (cli) {
        setClientName(cli.name);
        setClientPhone(cli.phone);
      }
    }
  }, [selectedClientId, clientMode]);

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor agrega el nombre del cliente');
      return;
    }

    // For optimistic update: resolve client locally (backend creates/links on actual save)
    const finalClient = repository.getOrCreateClient(clientName, clientPhone);
    const endTime     = addMinutesToTime(startTime, activeDuration);

    const newAppt: Appointment = {
      id:          `apt_${Date.now()}`,
      clientId:    finalClient.id,
      clientName:  finalClient.name,
      clientPhone: finalClient.phone,
      serviceId:   activeService.id,
      serviceName: activeService.name,
      date:        apptDate,
      startTime,
      endTime,
      status:      'Confirmada',
      notes:       notes.trim(),
      price:       activePrice,
      duration:    activeDuration,
      isOverbooked: false
    };

    // If there are collisions, show the overbook decision modal instead of saving silently
    if (collisions.length > 0) {
      setPendingAppt(newAppt);
      setShowOverbookModal(true);
      return;
    }

    executeSave(newAppt);
  };

  const executeSave = (appt: Appointment) => {
    addAppointment(appt);
    const template = settings.whatsappTemplates.confirmation;
    const finalMsg  = fillTemplate(template, {
      cliente:  appt.clientName,
      fecha:    formatFriendlyDate(appt.date),
      hora:     appt.startTime,
      servicio: appt.serviceName
    });
    setSavedApptText(finalMsg);
    setSavedPhone(appt.clientPhone);
    setIsSaved(true);
  };

  const handleSaveOverbook = () => {
    if (!pendingAppt) return;
    executeSave({ ...pendingAppt, isOverbooked: true });
    setShowOverbookModal(false);
  };

  const handleSearchSlots = () => {
    setShowOverbookModal(false);
    navigate('huecos');
  };

  const handleCopyMsg = () => {
    navigator.clipboard.writeText(savedApptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSaved) {
    return (
      <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12" id="new-appt-success">
        <div className="bg-dark-surface border border-accent-gold p-6 rounded-3xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-success-green/10 text-success-green flex items-center justify-center rounded-2xl mx-auto shadow-sm">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold font-display text-text-primary">¡Turno Agendado con éxito!</h2>
            <p className="text-xs text-text-secondary mt-1">
              Agregado correctamente para el {formatFriendlyDate(apptDate)} a las {startTime} hs.
            </p>
          </div>

          <div className="bg-[#141d26] p-4 rounded-xl text-left border border-border-dark/60">
            <span className="text-[10px] font-semibold text-text-secondary uppercase">Confirmación para enviar:</span>
            <p className="text-xs font-mono mt-1 text-text-primary leading-relaxed whitespace-pre-wrap">
              {savedApptText}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleCopyMsg}
              className="w-full bg-accent-gold text-dark-bg font-bold p-3 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
            >
              {copied ? '¡Copiado al portapapeles!' : 'Copiar Confirmación 📋'}
            </button>

            {savedPhone && (
              <a
                href={getWhatsAppLink(savedPhone, savedApptText)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] text-white font-bold p-3 rounded-2xl text-xs flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4 text-white/50" /> Enviar por WhatsApp
              </a>
            )}

            <button
              onClick={() => navigate('home')}
              className="w-full bg-dark-surface-2 hover:bg-dark-surface border border-border-dark py-2.5 rounded-2xl text-xs text-text-secondary"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12" id="appt-form-view">
      {/* Header */}
      <header className="flex items-center gap-2 mb-5">
        <button
          onClick={() => navigate('home')}
          className="p-1 px-2 rounded-xl text-text-secondary hover:text-text-primary bg-dark-surface/40 hover:bg-dark-surface cursor-pointer"
        >
          ← Cancelar
        </button>
        <h1 className="text-xl font-bold font-display ml-1">Nuevo Turno</h1>
      </header>

      <form onSubmit={handleCreateAppointment} className="space-y-4">
        {/* Client Selection Style Tabs */}
        <div className="bg-dark-surface border border-border-dark rounded-2xl p-4 space-y-4">
          <div className="flex border-b border-border-dark pb-3.5 justify-around">
            <button
              type="button"
              onClick={() => setClientMode('create')}
              className={`text-xs font-semibold py-1 px-3 rounded-lg transition ${
                clientMode === 'create'
                  ? 'bg-accent-gold/15 text-accent-gold'
                  : 'text-text-secondary'
              }`}
            >
              Nuevo Cliente
            </button>
            <button
              type="button"
              onClick={() => setClientMode('select')}
              className={`text-xs font-semibold py-1 px-3 rounded-lg transition ${
                clientMode === 'select'
                  ? 'bg-accent-gold/15 text-accent-gold'
                  : 'text-text-secondary'
              }`}
            >
              Buscar Registrado
            </button>
          </div>

          {clientMode === 'select' ? (
            <div>
              <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
                Elegir Cliente
              </label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary appearance-none"
                >
                  <option value="">-- Seleccionar de la lista --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || 'Sin número'}) {c.isFrequent ? '⭐' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-text-secondary">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
                  Nombre Cliente*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Gómez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
                  Celular WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="Ej. 5512345678"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Service & Operational fields Card */}
        <div className="bg-dark-surface border border-border-dark rounded-2xl p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
              Servicio contratado
            </label>
            <div className="relative">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3.5 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary cursor-pointer appearance-none"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${s.price} • {s.duration} min)
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-text-secondary">
                <Scissors className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                required
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark text-sm p-2.5 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
                Hora de Inicio
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark text-sm p-2.5 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary text-center cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
              Notas del corte / barbería (Opcional)
            </label>
            <textarea
              placeholder="Ej. Prefiere navaja libre en cuello o desvanecido alto"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary min-h-[70px] resize-none"
            />
          </div>
        </div>

        {/* Collisions Warning Banner — live feedback while building the form */}
        {collisions.length > 0 && (
          <div className="bg-warning-amber/10 border border-warning-amber/35 rounded-2xl p-4 flex gap-3 my-2.5" id="collision-banner">
            <AlertTriangle className="w-5 h-5 text-warning-amber flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-warning-amber uppercase tracking-wider">
                Empalme de horario detectado
              </p>
              <p className="text-[11px] text-text-secondary mt-1">
                Este horario coincide con las siguientes actividades:
              </p>
              <ul className="list-disc pl-4 mt-1.5 space-y-1 text-xs text-text-primary font-mono">
                {collisions.map((item, idx) => (
                  <li key={`coll-${idx}`}>{item.label}</li>
                ))}
              </ul>
              <p className="text-[10px] text-warning-amber/80 font-semibold mt-2">
                Al confirmar, se mostrará un menú de opciones.
              </p>
            </div>
          </div>
        )}

        {/* Create appointment Button */}
        <button
          type="submit"
          className="w-full bg-accent-gold text-dark-bg font-bold p-4 rounded-2xl text-center shadow-lg transition hover:brightness-110 active:scale-95"
          id="submit-appointments-btn"
        >
          Confirmar & Generar Link de WhatsApp
        </button>
      </form>

      {/* ── Overbook Decision Modal ── */}
      {showOverbookModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-[480px] bg-[#0F1115] border-t border-border-dark rounded-t-3xl p-6 space-y-4 shadow-2xl animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-warning-amber/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-warning-amber" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Horario Ocupado</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Esta hora ya tiene actividad. ¿Qué deseas hacer?
                </p>
              </div>
              <button
                onClick={() => setShowOverbookModal(false)}
                className="ml-auto p-1 rounded-lg text-text-secondary hover:text-text-primary"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="text-[11px] text-text-secondary bg-dark-surface rounded-xl px-4 py-3 space-y-1 font-mono">
              {collisions.map((c, i) => <li key={i} className="truncate">⚠ {c.label}</li>)}
            </ul>

            <div className="space-y-2 pt-1">
              {/* Option A: Search another slot */}
              <button
                onClick={handleSearchSlots}
                className="w-full flex items-center gap-3 bg-dark-surface-2 hover:bg-dark-surface border border-border-dark p-3.5 rounded-2xl text-left transition"
              >
                <Search className="w-5 h-5 text-accent-gold flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Buscar otro hueco</p>
                  <p className="text-[11px] text-text-secondary">Ver disponibilidad libre del día</p>
                </div>
              </button>

              {/* Option B: Save as overbook */}
              <button
                onClick={handleSaveOverbook}
                className="w-full flex items-center gap-3 bg-warning-amber/10 hover:bg-warning-amber/15 border border-warning-amber/40 p-3.5 rounded-2xl text-left transition"
              >
                <AlertTriangle className="w-5 h-5 text-warning-amber flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-warning-amber">Guardar como Sobrecupo</p>
                  <p className="text-[11px] text-text-secondary">Registrar la cita aunque haya empalme</p>
                </div>
              </button>

              {/* Option C: Cancel */}
              <button
                onClick={() => setShowOverbookModal(false)}
                className="w-full bg-dark-surface/60 hover:bg-dark-surface border border-border-dark py-3 rounded-2xl text-xs text-text-secondary text-center transition"
              >
                Cancelar — Ajustar horario manualmente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
