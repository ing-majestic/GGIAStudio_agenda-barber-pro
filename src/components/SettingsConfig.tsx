import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessSettings, Service } from '../types';
import { repository } from '../lib/mock-repository';
import { 
  Settings, Scissors, Clock, MessageSquare, RefreshCw, 
  Trash2, ShieldCheck, Check, ChevronDown, Plus 
} from 'lucide-react';

export const SettingsConfig: React.FC = () => {
  const {
    settings,
    services,
    saveSettings,
    refreshData,
    resetDemoData,
    navigate
  } = useApp();

  // General state
  const [bName, setBName] = useState<string>(settings.businessName);
  const [startHour, setStartHour] = useState<string>(settings.openTime);
  const [endHour, setEndHour] = useState<string>(settings.closeTime);
  const [closedMonday, setClosedMonday] = useState<boolean>(!settings.workingDays.includes(1));
  const [closedSunday, setClosedSunday] = useState<boolean>(!settings.workingDays.includes(0));
  
  // Custom templates editing
  const [tplAvail, setTplAvail] = useState<string>(settings.whatsappTemplates.availability);
  const [tplConfirm, setTplConfirm] = useState<string>(settings.whatsappTemplates.confirmation);
  const [tplResched, setTplResched] = useState<string>(settings.whatsappTemplates.reschedule);
  const [tplCancel, setTplCancel] = useState<string>(settings.whatsappTemplates.cancellation);
  const [tplReminder, setTplReminder] = useState<string>(settings.whatsappTemplates.reminder);

  const [savedGeneral, setSavedGeneral] = useState<boolean>(false);
  const [savedTpls, setSavedTpls] = useState<boolean>(false);

  // Services state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceNameField, setServiceNameField] = useState<string>('');
  const [serviceDurationField, setServiceDurationField] = useState<number>(30);
  const [servicePriceField, setServicePriceField] = useState<number>(200);
  const [serviceBufferField, setServiceBufferField] = useState<number>(5);
  const [serviceColorField, setServiceColorField] = useState<string>('#C89B3C');

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Recalculating workingDays:
    const activeDays = [0, 1, 2, 3, 4, 5, 6];
    const filteredDays = activeDays.filter(day => {
      if (day === 1 && closedMonday) return false;
      if (day === 0 && closedSunday) return false;
      return true;
    });

    const updatedSettings: BusinessSettings = {
      ...settings,
      businessName: bName.trim(),
      openTime: startHour,
      closeTime: endHour,
      workingDays: filteredDays
    };

    saveSettings(updatedSettings);
    setSavedGeneral(true);
    setTimeout(() => {
      setSavedGeneral(false);
    }, 2000);
  };

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedSettings: BusinessSettings = {
      ...settings,
      whatsappTemplates: {
        availability: tplAvail.trim(),
        confirmation: tplConfirm.trim(),
        reschedule: tplResched.trim(),
        cancellation: tplCancel.trim(),
        reminder: tplReminder.trim()
      }
    };

    saveSettings(updatedSettings);
    setSavedTpls(true);
    setTimeout(() => setSavedTpls(false), 2000);
  };

  // SERVICE EDIT SYSTEMS
  const handleStartEditService = (srv: Service) => {
    setEditingServiceId(srv.id);
    setServiceNameField(srv.name);
    setServiceDurationField(srv.duration);
    setServicePriceField(srv.price);
    setServiceBufferField(srv.buffer);
    setServiceColorField(srv.color);
  };

  const handleSaveServiceEdit = () => {
    if (!editingServiceId) return;

    const updatedSrv: Service = {
      id: editingServiceId,
      name: serviceNameField.trim(),
      duration: serviceDurationField,
      price: servicePriceField,
      buffer: serviceBufferField,
      color: serviceColorField
    };

    repository.saveService(updatedSrv);
    refreshData();
    setEditingServiceId(null);
  };

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12 animate-fade-in" id="settings-view">
      {/* Header */}
      <header className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('home')}
            className="p-1 px-2 rounded-xl text-text-secondary hover:text-text-primary bg-dark-surface/40 hover:bg-dark-surface cursor-pointer"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold font-display ml-1">Configuración Barbería</h1>
        </div>
      </header>

      {/* RURAL RULES SETTING CARD */}
      <form onSubmit={handleSaveGeneral} className="bg-dark-surface border border-border-dark p-4 rounded-2xl mb-5 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase text-accent-gold tracking-widest flex items-center gap-1">
          <Clock className="w-4 h-4" /> Configuración Horarios
        </h3>

        <div className="space-y-3.5">
          <div>
            <label className="text-[10px] text-text-secondary uppercase">Nombre Comercial Barbería</label>
            <input
              type="text"
              className="w-full bg-dark-surface-2 border border-border-dark p-3 rounded-xl text-xs text-text-primary focus:outline-none"
              value={bName}
              onChange={(e) => setBName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-secondary uppercase">Apertura (Horas)</label>
              <input
                type="time"
                className="w-full bg-dark-surface-2 border border-border-dark p-2.5 rounded-xl text-xs text-text-primary text-center focus:outline-none"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase">Cierre (Horas)</label>
              <input
                type="time"
                className="w-full bg-dark-surface-2 border border-border-dark p-2.5 rounded-xl text-xs text-text-primary text-center focus:outline-none"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
              />
            </div>
          </div>

          {/* Business Closure Days switchers */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="flex items-center justify-between bg-dark-surface-2 p-2.5 rounded-xl border border-border-dark/60">
              <span className="text-[10px] text-text-secondary font-medium">Lunes Cerrado</span>
              <input
                type="checkbox"
                checked={closedMonday}
                onChange={(e) => setClosedMonday(e.target.checked)}
                className="accent-accent-gold w-4 h-4 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between bg-dark-surface-2 p-2.5 rounded-xl border border-border-dark/60">
              <span className="text-[10px] text-text-secondary font-medium">Domingo Cerrado</span>
              <input
                type="checkbox"
                checked={closedSunday}
                onChange={(e) => setClosedSunday(e.target.checked)}
                className="accent-accent-gold w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {savedGeneral && (
          <p className="text-[10px] text-success-green font-bold text-center">✓ Horarios guardados correctamente</p>
        )}

        <button
          type="submit"
          className="w-full bg-dark-surface-2 hover:bg-dark-surface border border-border-dark hover:border-accent-gold py-2.5 rounded-xl text-xs font-bold text-text-primary transition"
        >
          Guardar Reglas Horarias
        </button>
      </form>

      {/* SERVICES CONFIGURATIONS BLOCK */}
      <section className="bg-dark-surface border border-border-dark p-4 rounded-2xl mb-5 space-y-4">
        <h3 className="text-xs font-bold uppercase text-accent-gold tracking-widest flex items-center gap-1">
          <Scissors className="w-4 h-4" /> Catálogo de Servicios & Buffers
        </h3>

        {editingServiceId ? (
          /* INTERNAL SERVICE EDITOR INTERACTIVE BOARD */
          <div className="bg-dark-surface-2 p-3.5 rounded-xl border border-accent-gold/45 space-y-3">
            <h4 className="text-[10px] uppercase font-bold text-accent-gold">Editar: {serviceNameField}</h4>
            <div className="space-y-2">
              <div>
                <label className="text-[9px] text-text-secondary uppercase">Nombre Servicio</label>
                <input
                  type="text"
                  className="w-full bg-dark-bg border border-border-dark p-2 rounded-lg text-xs"
                  value={serviceNameField}
                  onChange={(e) => setServiceNameField(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-text-secondary uppercase">Duración (min)</label>
                  <input
                    type="number"
                    className="w-full bg-dark-bg border border-border-dark p-2 rounded-lg text-xs"
                    value={serviceDurationField}
                    onChange={(e) => setServiceDurationField(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[9px] text-text-secondary uppercase">Precio ($)</label>
                  <input
                    type="number"
                    className="w-full bg-dark-bg border border-border-dark p-2 rounded-lg text-xs"
                    value={servicePriceField}
                    onChange={(e) => setServicePriceField(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-text-secondary uppercase">Buffer Descanso Posterior (min)</label>
                <input
                  type="number"
                  className="w-full bg-dark-bg border border-border-dark p-2 rounded-lg text-xs"
                  value={serviceBufferField}
                  onChange={(e) => setServiceBufferField(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex gap-1.5 justify-end pt-1">
              <button
                onClick={() => setEditingServiceId(null)}
                className="text-[10px] uppercase font-bold text-text-secondary px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveServiceEdit}
                className="bg-accent-gold hover:brightness-110 text-dark-bg text-[10px] uppercase font-bold px-4 py-1.5 rounded-lg"
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {services.map(s => (
              <div
                key={s.id}
                onClick={() => handleStartEditService(s)}
                className="bg-dark-surface-2 hover:bg-dark-surface-2/75 border border-border-dark/65 p-3 rounded-xl flex justify-between items-center cursor-pointer transition hover:translate-x-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <div>
                    <h4 className="text-xs font-bold text-text-primary leading-tight">{s.name}</h4>
                    <p className="text-[10px] text-text-secondary leading-normal mt-0.5">
                      {s.duration}m + {s.buffer}m buffer • ${s.price} MXN
                    </p>
                  </div>
                </div>
                <span className="text-[9px] text-accent-gold bg-dark-bg p-1 px-2 rounded-md font-mono hover:underline">Editar →</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* WHATSAPP SHARING CHAT TEMPLATES CARD */}
      <form onSubmit={handleSaveTemplates} className="bg-dark-surface border border-border-dark p-4 rounded-2xl mb-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase text-accent-gold tracking-widest flex items-center gap-1">
          <MessageSquare className="w-4 h-4" /> Ajustar Plantillas de WhatsApp
        </h3>
        <p className="text-[10px] text-text-secondary mt-1">
          Soporta placeholders: <strong className="text-accent-gold">{`{cliente}`}</strong>, <strong className="text-accent-gold">{`{servicio}`}</strong>, <strong className="text-accent-gold">{`{fecha}`}</strong>, <strong className="text-accent-gold">{`{hora}`}</strong>, o <strong className="text-accent-gold">{`{horarios}`}</strong> para buscar huecos.
        </p>

        <div className="space-y-4 pt-1">
          {/* Template: Availability */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1 uppercase">Buscar Huecos Libres</label>
            <textarea
              className="w-full bg-dark-surface-2 border border-border-dark p-3 rounded-xl text-xs text-text-primary h-[85px] font-mono resize-none"
              value={tplAvail}
              onChange={(e) => setTplAvail(e.target.value)}
            />
          </div>

          {/* Template: Confirmation */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1 uppercase">Confirmación de Cita exitosa</label>
            <textarea
              className="w-full bg-dark-surface-2 border border-border-dark p-3 rounded-xl text-xs text-text-primary h-[85px] font-mono resize-none"
              value={tplConfirm}
              onChange={(e) => setTplConfirm(e.target.value)}
            />
          </div>

          {/* Template: Reschedule */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1 uppercase">Reprogramación de Turno</label>
            <textarea
              className="w-full bg-dark-surface-2 border border-border-dark p-3 rounded-xl text-xs text-text-primary h-[80px] font-mono resize-none"
              value={tplResched}
              onChange={(e) => setTplResched(e.target.value)}
            />
          </div>

          {/* Template: Reminder */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1 uppercase">Recordatorio de Cita (Hoy)</label>
            <textarea
              className="w-full bg-dark-surface-2 border border-border-dark p-3 rounded-xl text-xs text-text-primary h-[80px] font-mono resize-none"
              value={tplReminder}
              onChange={(e) => setTplReminder(e.target.value)}
            />
          </div>
        </div>

        {savedTpls && (
          <p className="text-[11px] text-success-green font-bold text-center">✓ Plantillas WhatsApp actualizadas con éxito</p>
        )}

        <button
          type="submit"
          className="w-full bg-accent-gold text-dark-bg font-bold p-3 rounded-xl text-xs hover:brightness-110 transition"
        >
          Guardar Plantillas de WhatsApp
        </button>
      </form>

      {/* RE-INITIALIZATION HARD RESET BUTTONS */}
      <footer className="bg-dark-surface-2 border border-border-dark p-4 rounded-2xl text-center space-y-3 mb-8">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Mantenimiento de Datos</h4>
        <p className="text-[10px] text-text-secondary">Si necesitas borrar todo el historial simulado para iniciar de cero tu demostración:</p>
        
        <button
          onClick={() => {
            if (confirm('¿Restablecer de forma permanente? Se perderán todas tus citas y clientes creados en local.')) {
              resetDemoData();
              alert('Datos de muestra restablecidos con éxito.');
            }
          }}
          className="w-full bg-danger-red/10 border border-danger-red/25 hover:bg-danger-red text-danger-red hover:text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Borrar todo & Recargar demo
        </button>
      </footer>
    </div>
  );
};
