import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getAvailabilityForDate, getRecommendedSlots } from '../lib/availability-engine';
import { fillTemplate, getWhatsAppLink } from '../lib/whatsapp-templates';
import { formatFriendlyDate } from '../lib/date-utils';
import { Search, Scissors, Calendar, User, MessageSquare, Copy, Check, Users } from 'lucide-react';

export const SearchSlots: React.FC = () => {
  const {
    services,
    settings,
    selectedDate,
    setSelectedDate,
    navigate
  } = useApp();

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('Amigo');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [suggestedHours, setSuggestedHours] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Default selection for service if present
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [services]);

  const activeService = services.find(s => s.id === selectedServiceId) || services[0];

  // Recalculate suggestions whenever date, service, or clientName change
  useEffect(() => {
    if (!activeService) return;
    const slots = getRecommendedSlots(selectedDate, activeService);
    setSuggestedHours(slots);

    // Format the list of times
    const hoursFormatted = slots.length > 0
      ? slots.map(h => `• ${h} hs`).join('\n')
      : '⚠️ Sin horarios despejados';

    // Populate WhatsApp template
    const template = settings.whatsappTemplates.availability;
    const formatted = fillTemplate(template, {
      cliente: clientName || 'Amigo',
      fecha: formatFriendlyDate(selectedDate),
      servicio: activeService.name,
      horarios: hoursFormatted
    });
    setPreviewText(formatted);
  }, [selectedDate, selectedServiceId, clientName, settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSlots = suggestedHours.length > 0;

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12" id="search-slots-view">
      {/* Header */}
      <header className="flex items-center gap-2 mb-5">
        <button
          onClick={() => navigate('home')}
          className="p-1 px-2 rounded-xl text-text-secondary hover:text-text-primary bg-dark-surface/40 hover:bg-dark-surface cursor-pointer"
        >
          ← Volver
        </button>
        <h1 className="text-xl font-bold font-display ml-1">Buscar Huecos Libres</h1>
      </header>

      {/* Inputs Selector Card */}
      <div className="bg-dark-surface border border-border-dark p-4 rounded-2xl space-y-4 mb-5">
        {/* Service SELECT */}
        <div>
          <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-2">
            1. Seleccionar Servicio
          </label>
          <div className="relative">
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3.5 rounded-xl text-text-primary focus:outline-none focus:border-accent-gold cursor-pointer appearance-none"
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

        {/* Date SELECT */}
        <div>
          <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-2">
            2. Fecha a Consultar
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3.5 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Client Name Customizer */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
              Cliente (Nombre)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest block mb-1.5">
              WhatsApp (Opcional)
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="Ej. 5512345678"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark text-sm p-3 rounded-xl focus:outline-none focus:border-accent-gold text-text-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Slots Presentation Box */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold uppercase text-text-secondary mb-2.5 tracking-widest pl-1">
          Horarios Disponibles Destacados
        </h2>

        {hasSlots ? (
          <div className="grid grid-cols-4 gap-2.5">
            {suggestedHours.map((time, idx) => (
              <div
                key={`suggested-${time}-${idx}`}
                className="bg-accent-teal/15 border border-accent-teal/30 p-2 text-center rounded-xl font-mono text-sm font-bold text-accent-teal"
              >
                {time}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-dark-surface border border-danger-red/20 p-5 rounded-2xl text-center text-text-secondary text-sm">
            ❌ No hay horarios disponibles para {activeService?.name} en la fecha indicada.
          </div>
        )}
      </section>

      {/* WhatsApp Message Copier Board */}
      <section className="bg-dark-surface border border-border-dark rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-dark-surface-2 p-3.5 border-b border-border-dark flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-accent-gold" /> Preview Mensaje de WhatsApp
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-accent-gold text-dark-bg font-semibold text-xs py-1.5 px-3 rounded-xl hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-[#141d26] font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap min-h-[140px] select-all border-b border-border-dark/60">
          {previewText}
        </div>

        {/* Action Button Trigger directly to WhatsApp */}
        <div className="p-3 bg-dark-bg/30">
          <a
            href={getWhatsAppLink(clientPhone || '', previewText)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#20ba56] text-white font-bold p-3.5 rounded-xl text-center flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <MessageSquare className="w-4.5 h-4.5 fill-white stroke-none" /> Enviar Directo por WhatsApp
          </a>
          <p className="text-[10px] text-text-secondary/70 text-center mt-2.5">
            El enlace abrirá WhatsApp pre-cargado con este texto e información del cliente de forma rápida.
          </p>
        </div>
      </section>
    </div>
  );
};
