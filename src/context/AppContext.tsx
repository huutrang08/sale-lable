'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { User, ShipService } from '@/types';

interface AppContextType {
  currentUser: User | null;
  services: ShipService[];
  selectedService: ShipService | null;
  activeTab: string;
  toast: string;
  loadingAuth: boolean;
  setCurrentUser: (u: User | null) => void;
  setServices: (s: ShipService[]) => void;
  setSelectedService: (s: ShipService | null) => void;
  setActiveTab: (t: string) => void;
  showToast: (msg: string, duration?: number) => void;
  updateBalance: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [services, setServices] = useState<ShipService[]>([]);
  const [selectedService, setSelectedService] = useState<ShipService | null>(null);
  const [activeTab, setActiveTab] = useState('create');
  const [toast, setToast] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true);

  const showToast = useCallback((msg: string, duration = 2800) => {
    setToast(msg);
    setTimeout(() => setToast(''), duration);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      setLoadingAuth(true);
      const res = await fetch('/api/user/me');
      const json = await res.json();
      if (json.success) {
        setCurrentUserState(json.data);
      } else {
        setCurrentUserState(null);
      }
    } catch {
      setCurrentUserState(null);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const updateBalance = async () => {
    await fetchUser();
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUserState(null);
    setServices([]);
    setSelectedService(null);
    setActiveTab('create');
  };

  return (
    <AppContext.Provider value={{
      currentUser, services, selectedService, activeTab, toast, loadingAuth,
      setCurrentUser: setCurrentUserState, setServices, setSelectedService, setActiveTab,
      showToast, updateBalance, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
