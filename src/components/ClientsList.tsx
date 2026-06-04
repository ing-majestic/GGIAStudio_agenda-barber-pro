import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { repository } from '../lib/mock-repository';
import { 
  Users, Search, UserCheck, Star, AlertTriangle, MessageSquare, 
  Plus, Check, Sparkles, BookOpen, Clock, Scissors, Calendar 
} from 'lucide-react';
import { getWhatsAppLink } from '../lib/whatsapp-templates';
import { formatFriendlyDate } from '../lib/date-utils';

export const ClientsList: React.FC = () => {
  const {
    clients,
    appointments,
    refreshData,
    navigate
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Form states for creating a new client
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [newClientNotes, setNewClientNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleAddNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const newCli = {
      id: `cli_${Date.now()}`,
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      notes: newClientNotes.trim(),
      noShowCount: 0,
      isFrequent: false
    };

    repository.saveClient(newCli);
    refreshData();

    setNewClientName('');
    setNewClientPhone('');
    setNewClientNotes('');
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setShowAddForm(false);
    }, 2000);
  };

  // Filter list of clients
  const filteredClients = clients.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  });

  const activeClient = clients.find(c => c.id === selectedClientId);

  // Appointments historical list for active client
  const clientAppointments = activeClient
    ? appointments
        .filter(a => a.clientId === activeClient.id)
        .sort((a, b) => b.date.localeCompare(a.date)) // descending chronologically
    : [];

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto h-full max-w-[480px] mx-auto bg-dark-bg text-text-primary mb-12" id="clients-view">
      {/* Header */}
      <header className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('home')}
            className="p-1 px-2 rounded-xl text-text-secondary hover:text-text-primary bg-dark-surface/40 hover:bg-dark-surface cursor-pointer"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold font-display ml-1">Clientes Registrados</h1>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setSelectedClientId(null);
          }}
          className="bg-accent-gold text-dark-bg p-2 rounded-xl font-bold shadow-md hover:brightness-110 flex items-center gap-1 cursor-pointer text-xs uppercase"
        >
          <Plus className="w-4 h-4 text-dark-bg stroke-[2.5]" /> Nuevo
        </button>
      </header>

      {/* Insert client quick form */}
      {showAddForm && (
        <form onSubmit={handleAddNewClient} className="bg-dark-surface border border-accent-gold p-4 rounded-2xl mb-4 space-y-3 shadow-lg">
          <h3 className="text-xs font-bold uppercase text-accent-gold tracking-widest">Registrar Nuevo Cliente</h3>
          
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[9px] text-text-secondary uppercase">Nombre*</label>
              <input
                required
                type="text"
                placeholder="Ej. Andrés Lozano"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark p-2 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] text-text-secondary uppercase">WhatsApp / Celular</label>
              <input
                type="tel"
                placeholder="Ej. 5512993322"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                className="w-full bg-dark-surface-2 border border-border-dark p-2 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] text-text-secondary uppercase">Notas operativas (Gusto, estilo, etc.)</label>
            <input
              type="text"
              placeholder="Ej. Corte rebajado, usa navaja libre"
              value={newClientNotes}
              onChange={(e) => setNewClientNotes(e.target.value)}
              className="w-full bg-dark-surface-2 border border-border-dark p-2 rounded-lg text-xs"
            />
          </div>

          {successMsg && (
            <p className="text-[10px] text-success-green font-bold text-center">✔ ¡Cliente registrado con éxito!</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[10px] uppercase font-bold text-text-secondary hover:text-text-primary px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-accent-gold text-dark-bg text-[10px] uppercase font-bold px-4 py-1.5 rounded-lg"
            >
              Guardar Cliente
            </button>
          </div>
        </form>
      )}

      {/* Global client searchbar */}
      <div className="relative mb-5">
        <input
          type="text"
          placeholder="Buscar por nombre o número..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-dark-surface border border-border-dark p-3.5 pr-10 rounded-2xl text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-teal"
        />
        <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-text-secondary" />
      </div>

      {/* Main flow wrapper clients: Left grid list vs right detailed modal */}
      {!activeClient ? (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase text-text-secondary tracking-widest pl-1">Listado de Clientes</h2>
          {filteredClients.length === 0 ? (
            <div className="bg-dark-surface border border-border-dark p-8 rounded-2xl text-center text-text-secondary">
              <Users className="w-8 h-8 mx-auto text-text-secondary/35 stroke-[1.5] mb-2" />
              <p className="text-xs">Sin clientes registrados coincidentes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map(c => {
                const totalAppointments = appointments.filter(a => a.clientId === c.id).length;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedClientId(c.id);
                      setShowAddForm(false);
                    }}
                    className="bg-dark-surface border border-border-dark/60 hover:border-accent-gold p-3.5 rounded-2xl flex justify-between items-center cursor-pointer transition-all hover:translate-x-0.5 active:scale-99"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-dark-surface-2 border border-border-dark flex items-center justify-center rounded-xl text-text-primary font-bold">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                          {c.name}
                          {c.isFrequent && <Star className="w-3.5 h-3.5 fill-accent-gold text-accent-gold" title="Cliente Frecuente" />}
                          {c.noShowCount >= 2 && <AlertTriangle className="w-3.5 h-3.5 text-danger-red" title="Alerta: Historial Inasistencias (No-Show)" />}
                        </span>
                        <span className="text-[11px] text-text-secondary mt-0.5">
                          {c.phone ? `📞 ${c.phone}` : 'Sin teléfono'} • {totalAppointments} citas
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-accent-gold uppercase font-semibold hover:underline">Ver perfil →</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* DETAILED PROFILER BLOCK FOR MAXIMUM UX */
        <section className="bg-dark-surface border border-accent-teal/50 rounded-2xl p-4 shadow-xl space-y-4" id="client-profiler">
          <div className="flex justify-between items-start border-b border-border-dark/60 pb-3">
            <div>
              <span className="text-[9px] uppercase font-bold text-accent-teal">Perfil del Cliente</span>
              <h2 className="text-lg font-bold text-text-primary">{activeClient.name}</h2>
              {activeClient.phone && <p className="text-xs text-text-secondary mt-1 font-mono">Celular: {activeClient.phone}</p>}
            </div>
            <button
              onClick={() => setSelectedClientId(null)}
              className="text-xs text-text-secondary hover:text-text-primary bg-dark-surface-2 p-1 px-2.5 rounded-xl border border-border-dark"
            >
              Volver a lista
            </button>
          </div>

          {/* Client summary metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-dark-bg rounded-xl p-3 flex flex-col justify-center border border-border-dark/40">
              <span className="text-[10px] text-text-secondary leading-none uppercase">Citas Registradas</span>
              <span className="text-lg font-bold text-text-primary mt-1">{clientAppointments.length}</span>
            </div>
            
            <div className="bg-dark-bg rounded-xl p-3 flex flex-col justify-center border border-border-dark/40">
              <span className="text-[10px] text-text-secondary leading-none uppercase">Faltas (No-Show)</span>
              <span className={`text-lg font-bold mt-1 ${activeClient.noShowCount > 0 ? 'text-danger-red' : 'text-text-primary'}`}>
                {activeClient.noShowCount}
              </span>
            </div>
          </div>

          {/* Client Notes */}
          <div>
            <span className="text-[10px] text-text-secondary uppercase">Notas del Barbero:</span>
            <p className="text-xs italic bg-dark-bg p-3.5 rounded-xl border border-border-dark/60 text-text-primary mt-1">
              {activeClient.notes || 'Ninguna nota agregada sobre este cliente.'}
            </p>
          </div>

          {/* Past and Upcoming Appointments timeline */}
          <div>
            <h3 className="text-xs font-bold uppercase text-text-secondary tracking-wider mb-2.5 pl-1">
              Historial de Citas
            </h3>

            {clientAppointments.length === 0 ? (
              <p className="text-xs text-text-secondary/70 italic text-center py-5">Ninguna cita registrada aún para este cliente.</p>
            ) : (
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {clientAppointments.map(a => (
                  <div
                    key={a.id}
                    onClick={() => navigate('detalle-cita', a.id)}
                    className="bg-dark-surface-2 border border-border-dark hover:border-accent-gold p-2.5 rounded-xl flex justify-between items-center cursor-pointer transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex flex-col text-left">
                        <span className="text-[11px] font-bold text-text-primary">{formatFriendlyDate(a.date)}</span>
                        <span className="text-[10px] text-text-secondary mt-0.5">{a.startTime} hs • {a.serviceName}</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-dark-bg font-mono font-bold px-2 py-0.5 rounded text-accent-gold uppercase">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trigger new appointment shortcut for active client */}
          <div className="pt-2 border-t border-border-dark/40 flex gap-2">
            <button
              onClick={() => {
                // Populate custom client preselection mode directly using standard fields
                localStorage.setItem('barber_preselected_time', '12:00');
                navigate('nueva-cita');
              }}
              className="flex-1 bg-accent-gold text-dark-bg font-bold p-3 rounded-xl text-center text-xs"
            >
              Agendar cita rápida 💈
            </button>
            {activeClient.phone && (
              <a
                href={getWhatsAppLink(activeClient.phone, `¡Hola qué tal ${activeClient.name}! Te saludo de Barbería Pro. ¿Qué día pasas por tu servicio? 💈`)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-dark-surface-2 hover:bg-[#25D366]/10 text-white border border-border-dark p-2.5 rounded-xl flex items-center justify-center transition"
              >
                <MessageSquare className="w-5 h-5 text-green-500" />
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
