import {
  createContext,
  useState,
  useEffect,
  useContext,
  type ReactNode,
} from "react";

import type {
  User,
  Family,
  AidType,
  AidDistribution,
  AuditLog,
} from "../types";

import {
  mockFamilies,
  mockAidTypes,
  mockAidDistributions,
  mockAuditLogs,
} from "../data/mockData";

/*
========================================
CONTEXT TYPE
========================================
*/

interface AppContextType {
  currentUser: User | null | undefined;

  setCurrentUser: (user: User | null) => void;

  families: Family[];

  setFamilies: React.Dispatch<React.SetStateAction<Family[]>>;

  aidTypes: AidType[];

  setAidTypes: React.Dispatch<React.SetStateAction<AidType[]>>;

  aidDistributions: AidDistribution[];

  setAidDistributions: React.Dispatch<React.SetStateAction<AidDistribution[]>>;

  auditLogs: AuditLog[];

  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;

  sidebarOpen: boolean;

  setSidebarOpen: (open: boolean) => void;
}

/*
========================================
CREATE CONTEXT
========================================
*/

const AppContext = createContext<AppContextType | undefined>(undefined);

/*
========================================
APP PROVIDER
========================================
*/

export function AppProvider({ children }: { children: ReactNode }) {
  /*
  ========================================
  CURRENT USER
  ========================================
  */

  // undefined = ما خلص تحميل
  // null = غير مسجل دخول
  // User = مسجل دخول

  const [currentUser, setCurrentUser] = useState<User | null | undefined>(
    undefined,
  );

  /*
  ========================================
  AUTO LOGIN
  ========================================
  */

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("AUTO LOGIN ERROR:", error);

      setCurrentUser(null);
    }
  }, []);

  /*
  ========================================
  STATES
  ========================================
  */

  const [families, setFamilies] = useState<Family[]>(() => {
    const savedFamilies = localStorage.getItem("families");

    return savedFamilies ? JSON.parse(savedFamilies) : mockFamilies;
  });
  useEffect(() => {
    localStorage.setItem("families", JSON.stringify(families));
  }, [families]);

  const [aidTypes, setAidTypes] = useState<AidType[]>(mockAidTypes);

  const [aidDistributions, setAidDistributions] =
    useState<AidDistribution[]>(mockAidDistributions);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  /*
  ========================================
  AUDIT LOG
  ========================================
  */

  const addAuditLog = (log: Omit<AuditLog, "id" | "timestamp">) => {
    const newLog: AuditLog = {
      ...log,

      id: `al${Date.now()}`,

      timestamp: new Date().toISOString(),
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  /*
  ========================================
  PROVIDER
  ========================================
  */

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,

        families,
        setFamilies,

        aidTypes,
        setAidTypes,

        aidDistributions,
        setAidDistributions,

        auditLogs,
        addAuditLog,

        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/*
========================================
USE APP
========================================
*/

export function useApp() {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }

  return ctx;
}
