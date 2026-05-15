import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, Family, AidType, AidDistribution, AuditLog } from '../types';
import { mockFamilies, mockAidTypes, mockAidDistributions, mockAuditLogs } from '../data/mockData';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  families: Family[];
  setFamilies: React.Dispatch<React.SetStateAction<Family[]>>;
  aidTypes: AidType[];
  setAidTypes: React.Dispatch<React.SetStateAction<AidType[]>>;
  aidDistributions: AidDistribution[];
  setAidDistributions: React.Dispatch<React.SetStateAction<AidDistribution[]>>;
  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [families, setFamilies] = useState<Family[]>(mockFamilies);
  const [aidTypes, setAidTypes] = useState<AidType[]>(mockAidTypes);
  const [aidDistributions, setAidDistributions] = useState<AidDistribution[]>(mockAidDistributions);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `al${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      families, setFamilies,
      aidTypes, setAidTypes,
      aidDistributions, setAidDistributions,
      auditLogs, addAuditLog,
      sidebarOpen, setSidebarOpen,
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
