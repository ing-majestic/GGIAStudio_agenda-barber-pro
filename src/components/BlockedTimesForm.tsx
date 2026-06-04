import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { repository } from '../lib/mock-repository';
import { getTodayString, addMinutesToTime, formatFriendlyDate, parseTimeToMinutes } from '../lib/date-utils';
import { Coffee, Plus, Trash2, Calendar, Clock, Lock, Sparkles, Check, ChevronDown } from 'lucide-react';

export const BlockedTimesForm: React.FC = () => {
  const {
    blockedTimes,
    selectedDate,
    setSelectedDate,
    refreshData,
    addBlockedTime,
    deleteBlockedTime,
    navigate
  } = useApp();

  // Custom Form fields
  const [label, setLabel] = useState<string>('Comida 🍔');
  const [dateField, setDateField] = useState<string>(selectedDate);
  const [startClock, setStartClock] = useState<string>('15:00');
  const [endClock, setEndClock] = useState<string>('15:45');
  const [success, setSuccess] = useState<boolean>(false);

  // List of active blocks for active selectedDate
  const currentDayBlocks = blockedTimes
    .filter(b => b.date === selectedDate)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  // Handle saving manual block
  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    if (parseTimeToMinutes(startClock) >= parseTimeToMinutes(endClock)) {
      alert('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    const newBlock = {
      id: `blk_${Date.now()}`,
      label: label.trim(),
      date: dateField,
      startTime: startClock,
      endTime: endClock
    };

    addBlockedTime(newBlock);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  // Perform custom Fast Block (e.g., block meal starting now)
  const handleFastBlock = (labelStr: string, durationMin: number) => {
    // Get current real time or default workspace simulated hour "14:15"
    const startNow = '14:15'; // aligns with home simulated timeline default
    const endNow = addMinutesToTime(startNow, durationMin);

    const quickBlock = {
      id: `blk_fast_${Date.now()}`,
      label: labelStr,
      date: getTodayString(),
      startTime: startNow,
      endTime: endNow
    };

    addBlockedTime(quickBlock);
    setDateField(getTodayString());
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este bloqueo de tiempo? La hora quedará libre en la agenda.')) {
      deleteBlockedTime(id);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12" id="blocks-view">
      {/* Header */}
      <header className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('home')}
            className="p-1 px-2 rounded-xl text-text-secondary hover:text-text-primary bg-dark-surface/40 hover:bg-dark-surface cursor-pointer"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold font-display ml-1">Bloqueos de Tiempo</h1>
        </div>
      </header>

      {/* Selector Date card */}
      <div className="mb-4 bg-dark-surface/60 border border-border-dark p-3.5 rounded-2xl flex justify-between items-center">
        <div>
          <span className="text-[10px] text-text-secondary uppercase">Agenda activa:</span>
          <p className="text-sm font-bold text-accent-gold mt-1">{formatFriendlyDate(selectedDate)}</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setDateField(e.target.value);
          }}
          className="bg-dark-surface-2 border border-border-dark text-xs p-2 rounded-xl text-text-primary focus:outline-none"
        />
      </div>

      {/* QUICK LAUNCH INSTANT BLOCKS FOR OPERATIVE COMFORT */}
      <section className="bg-dark-surface border border-accent-gold/30 rounded-2xl p-4 mb-5 space-y-3.5">
        <h3 className="text-xs font-bold uppercase text-accent-gold tracking-widest flex items-center gap-1">
          <Sparkles className="w-4 h-4" /> Bloqueo Rápido Digital (Hoy, 14:15 hs)
        </h3>
        <p className="text-[11px] text-text-secondary">Bloquea espacios comunes al instante, sin rellenar formularios largos:</p>
        
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleFastBlock('Comida 🍔', 40)}
            className="bg-dark-surface-2 hover:bg-danger-red/10 border border-border-dark hover:border-danger-red text-center p-2.5 rounded-xl cursor-pointer transition active:scale-95"
          >
            <span className="block text-xs font-bold text-text-primary">Comida</span>
            <span className="text-[10px] text-text-secondary">40 min</span>
          </button>

          <button
            onClick={() => handleFastBlock('Descanso ☕', 15)}
            className="bg-dark-surface-2 hover:bg-warning-amber/10 border border-border-dark hover:border-warning-amber text-center p-2.5 rounded-xl cursor-pointer transition active:scale-95"
          >
            <span className="block text-xs font-bold text-text-primary">Café / Break</span>
            <span className="text-[10px] text-text-secondary">15 min</span>
          </button>

          <button
            onClick={() => handleFastBlock('Asunto Personal 💼', 60)}
            className="bg-dark-surface-2 hover:bg-accent-teal/10 border border-border-dark hover:border-accent-teal text-center p-2.5 rounded-xl cursor-pointer transition active:scale-95"
          >
            <span className="block text-xs font-bold text-text-primary">Personal</span>
            <span className="text-[10px] text-text-secondary">1 hora</span>
          </button>
        </div>
      </section>

      {/* MANUAL FULL BLOCK CREATION FORM */}
      <form onSubmit={handleSaveBlock} className="bg-dark-surface border border-border-dark p-4 rounded-2xl mb-5 space-y-4">
        <h3 className="text-xs font-bold uppercase text-text-secondary tracking-widest">Crear Bloqueo Personalizado</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-text-secondary block mb-1">Nombre / Razón de bloqueo</label>
            <input
              type="text"
              required
              placeholder="Ej. Dentista, Almuerzo largo, Junta"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-dark-surface-2 border border-border-dark p-3 rounded-xl text-xs text-text-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-secondary block mb-1">Inicio (Hora)</label>
              <input
                type="time"
                required
                value={startClock}
                onChange={(e) => setStartClock(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark p-2.5 rounded-xl text-xs text-text-primary text-center focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary block mb-1">Fin (Hora)</label>
              <input
                type="time"
                required
                value={endClock}
                onChange={(e) => setEndClock(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark p-2.5 rounded-xl text-xs text-text-primary text-center focus:outline-none"
              />
            </div>
          </div>
        </div>

        {success && (
          <p className="text-[11px] text-success-green font-bold text-center flex items-center justify-center gap-1">
            <Check className="w-3.5 h-3.5" /> ¡Bloqueo guardado en la agenda diaria!
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-accent-gold text-dark-bg font-bold p-3 rounded-xl text-xs hover:brightness-110 shadow-sm"
        >
          Agregar Bloqueo
        </button>
      </form>

      {/* TODAY'S BLOCKED SLOTS LIST */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold uppercase text-text-secondary tracking-widest pl-1">
          Bloqueos Activos ({formatFriendlyDate(selectedDate)})
        </h3>

        {currentDayBlocks.length === 0 ? (
          <div className="bg-dark-surface border border-dashed border-border-dark/60 p-5 rounded-2xl text-center text-text-secondary text-xs">
            Ningún bloqueo de comida o descanso registrado hoy. ¡Agenda libre!
          </div>
        ) : (
          <div className="space-y-2">
            {currentDayBlocks.map(block => (
              <div
                key={block.id}
                className="bg-dark-surface p-3.5 border border-border-dark rounded-xl flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-danger-red/10 text-danger-red rounded-lg">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary">{block.label}</p>
                    <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                      Horario: {block.startTime} - {block.endTime}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(block.id)}
                  className="p-2.5 hover:bg-danger-red/10 text-text-secondary hover:text-danger-red rounded-lg border border-border-dark hover:border-danger-red/40 transition"
                  title="Eliminar Bloqueo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
