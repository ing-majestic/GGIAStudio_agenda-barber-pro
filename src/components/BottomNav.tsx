import React from 'react';
import { Home, Calendar, Search, Users, Settings } from 'lucide-react';
import { useApp, AppView } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const { currentView, navigate } = useApp();

  const items = [
    { view: 'home' as AppView, label: 'Inicio', icon: Home },
    { view: 'agenda' as AppView, label: 'Agenda', icon: Calendar },
    { view: 'huecos' as AppView, label: 'Huecos', icon: Search },
    { view: 'clientes' as AppView, label: 'Clientes', icon: Users },
    { view: 'config' as AppView, label: 'Ajustes', icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-surface/95 border-t border-border-dark py-2 px-4 backdrop-blur-md flex justify-around items-center max-w-[480px] mx-auto rounded-t-2xl shadow-xl">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        
        return (
          <button
            key={item.view}
            onClick={() => navigate(item.view)}
            className="flex flex-col items-center justify-center py-1 px-3 relative transition-all duration-300 group touch-manipulation"
            id={`nav-btn-${item.view}`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-accent-gold/15 text-accent-gold scale-110'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-surface-2/40'
              }`}
            >
              <Icon className="w-5.5 h-5.5" />
            </div>
            <span
              className={`text-[10px] mt-1 font-medium select-none transition-all duration-300 ${
                isActive ? 'text-accent-gold font-semibold' : 'text-text-secondary group-hover:text-text-primary'
              }`}
            >
              {item.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-accent-gold" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
