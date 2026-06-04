import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appointment, Client, Service, BlockedTime, BusinessSettings } from '../types';
import { repository } from '../lib/mock-repository';
import { getTodayString } from '../lib/date-utils';
import {
  apiGetAppointments, apiGetClients, apiGetServices, apiGetBlockedTimes, apiGetSettings,
  apiCreateAppointment, apiUpdateAppointment, apiDeleteAppointment,
  apiCreateBlockedTime, apiDeleteBlockedTime,
  apiUpdateSettings
} from '../lib/api-client';

export type AppView =
  | 'home'
  | 'agenda'
  | 'huecos'
  | 'nueva-cita'
  | 'detalle-cita'
  | 'clientes'
  | 'bloqueos'
  | 'config';

interface AppContextType {
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  blockedTimes: BlockedTime[];
  settings: BusinessSettings;
  selectedDate: string; // YYYY-MM-DD
  currentView: AppView;
  selectedAppointmentId: string | null;
  navigationHistory: AppView[];
  isOnline: boolean; // true when API is reachable

  setSelectedDate: (date: string) => void;
  navigate: (view: AppView, appointmentId?: string | null) => void;
  goBack: () => void;

  // Data management (optimistic updates; API-first with localStorage fallback)
  refreshData: () => void;
  addAppointment: (appt: Appointment) => void;
  updateAppointment: (appt: Appointment) => void;
  deleteAppointment: (id: string) => void;
  addBlockedTime: (block: BlockedTime) => void;
  deleteBlockedTime: (id: string) => void;
  saveSettings: (settings: BusinessSettings) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients,      setClients]      = useState<Client[]>([]);
  const [services,     setServices]     = useState<Service[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [settings,     setSettings]     = useState<BusinessSettings>(repository.getSettings());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [currentView,  setCurrentView]  = useState<AppView>('home');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<AppView[]>(['home']);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  // Internal: fetch all data from API and sync localStorage cache
  const fetchFromAPI = async (): Promise<boolean> => {
    try {
      const [appts, cls, srvs, blks, stgs] = await Promise.all([
        apiGetAppointments(),
        apiGetClients(),
        apiGetServices(),
        apiGetBlockedTimes(),
        apiGetSettings()
      ]);
      // Keep localStorage cache in sync so availability-engine works offline
      repository.updateCache({ appointments: appts, services: srvs, clients: cls, blockedTimes: blks, settings: stgs });
      setAppointments(appts);
      setClients(cls);
      setServices(srvs);
      setBlockedTimes(blks);
      setSettings(stgs);
      setIsOnline(true);
      return true;
    } catch {
      return false;
    }
  };

  // refreshData: API-first, localStorage fallback
  const refreshData = (): void => {
    fetchFromAPI().then(ok => {
      if (!ok) {
        setAppointments(repository.getAppointments());
        setClients(repository.getClients());
        setServices(repository.getServices());
        setBlockedTimes(repository.getBlockedTimes());
        setSettings(repository.getSettings());
        setIsOnline(false);
      }
    });
  };

  // Initial load
  useEffect(() => { refreshData(); }, []);

  const navigate = (view: AppView, appointmentId: string | null = null) => {
    if (appointmentId) {
      setSelectedAppointmentId(appointmentId);
    }
    setNavigationHistory(prev => [...prev, view]);
    setCurrentView(view);
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const updatedHistory = [...navigationHistory];
      updatedHistory.pop(); // remove current
      const previousView = updatedHistory[updatedHistory.length - 1];
      setNavigationHistory(updatedHistory);
      setCurrentView(previousView);
    } else {
      setCurrentView('home');
    }
  };

  const addAppointment = (appt: Appointment): void => {
    // Optimistic update so UI responds immediately
    setAppointments(prev => [...prev, appt]);
    repository.saveAppointment(appt);

    if (isOnline) {
      apiCreateAppointment({
        clientName:   appt.clientName,
        clientPhone:  appt.clientPhone,
        serviceId:    appt.serviceId,
        date:         appt.date,
        startTime:    appt.startTime,
        notes:        appt.notes,
        isOverbooked: appt.isOverbooked
      }).then(() => {
        fetchFromAPI().catch(() => { /* keep optimistic data */ });
      }).catch(err => {
        console.error('[addAppointment] API error:', err);
        refreshData();
      });
    }
  };

  const updateAppointment = (appt: Appointment): void => {
    setAppointments(prev => prev.map(a => a.id === appt.id ? appt : a));
    repository.saveAppointment(appt);

    if (isOnline) {
      apiUpdateAppointment({
        id:          appt.id,
        status:      appt.status,
        notes:       appt.notes,
        startTime:   appt.startTime,
        serviceId:   appt.serviceId,
        date:        appt.date,
        isOverbooked: appt.isOverbooked
      }).then(() => {
        fetchFromAPI().catch(() => { /* keep optimistic data */ });
      }).catch(err => {
        console.error('[updateAppointment] API error:', err);
        refreshData();
      });
    }
  };

  const deleteAppointment = (id: string): void => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    repository.deleteAppointment(id);

    if (isOnline) {
      apiDeleteAppointment(id).catch(err => {
        console.error('[deleteAppointment] API error:', err);
        refreshData();
      });
    }
  };

  const addBlockedTime = (block: BlockedTime): void => {
    setBlockedTimes(prev => [...prev, block]);
    repository.saveBlockedTime(block);

    if (isOnline) {
      apiCreateBlockedTime({
        label:     block.label,
        date:      block.date,
        startTime: block.startTime,
        endTime:   block.endTime
      }).then(() => {
        fetchFromAPI().catch(() => { /* keep optimistic data */ });
      }).catch(err => {
        console.error('[addBlockedTime] API error:', err);
      });
    }
  };

  const deleteBlockedTime = (id: string): void => {
    setBlockedTimes(prev => prev.filter(b => b.id !== id));
    repository.deleteBlockedTime(id);

    if (isOnline) {
      apiDeleteBlockedTime(id).catch(err => {
        console.error('[deleteBlockedTime] API error:', err);
        refreshData();
      });
    }
  };

  const updateBusinessSettings = (newSettings: BusinessSettings): void => {
    setSettings(newSettings);
    repository.saveSettings(newSettings);

    if (isOnline) {
      apiUpdateSettings(newSettings).catch(err => {
        console.error('[saveSettings] API error:', err);
      });
    }
  };

  const resetDemoData = () => {
    repository.resetToDefaults();
    refreshData();
    setSelectedDate(getTodayString());
    setCurrentView('home');
    setSelectedAppointmentId(null);
    setNavigationHistory(['home']);
  };

  return (
    <AppContext.Provider
      value={{
        appointments,
        clients,
        services,
        blockedTimes,
        settings,
        selectedDate,
        currentView,
        selectedAppointmentId,
        navigationHistory,
        isOnline,
        setSelectedDate,
        navigate,
        goBack,
        refreshData,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addBlockedTime,
        deleteBlockedTime,
        saveSettings: updateBusinessSettings,
        resetDemoData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
