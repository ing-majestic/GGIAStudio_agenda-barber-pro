import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { HomeDashboard } from './components/HomeDashboard';
import { AgendaList } from './components/AgendaList';
import { SearchSlots } from './components/SearchSlots';
import { AppointmentForm } from './components/AppointmentForm';
import { AppointmentDetail } from './components/AppointmentDetail';
import { ClientsList } from './components/ClientsList';
import { BlockedTimesForm } from './components/BlockedTimesForm';
import { SettingsConfig } from './components/SettingsConfig';
import { BottomNav } from './components/BottomNav';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { currentView } = useApp();

  const renderActiveView = () => {
    switch (currentView) {
      case 'home':
        return <HomeDashboard />;
      case 'agenda':
        return <AgendaList />;
      case 'huecos':
        return <SearchSlots />;
      case 'nueva-cita':
        return <AppointmentForm />;
      case 'detalle-cita':
        return <AppointmentDetail />;
      case 'clientes':
        return <ClientsList />;
      case 'bloqueos':
        return <BlockedTimesForm />;
      case 'config':
        return <SettingsConfig />;
      default:
        return <HomeDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#07090c] flex items-center justify-center p-0 md:p-6 select-none font-sans">
      {/* Premium simulated phone bezel on desktop viewpoints, becomes full screen on mobile devices */}
      <div className="w-full max-w-[480px] h-screen md:h-[850px] md:max-h-[92vh] md:rounded-[42px] md:border-[9px] md:border-[#1E232D] bg-[#0F1115] md:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col md:ring-4 md:ring-accent-gold/15">
        
        {/* Dynamic Screen Viewport Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full w-full overflow-hidden"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global sticky Bottom Nav standard bar */}
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
