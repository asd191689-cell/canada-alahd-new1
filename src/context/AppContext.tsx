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

import { api } from "../api/apiClient";

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
  users: User[];

  auditLogs: AuditLog[];

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

  const [families, setFamilies] = useState<Family[]>([]);

  const [aidTypes, setAidTypes] = useState<AidType[]>([]);

  const [aidDistributions, setAidDistributions] = useState<AidDistribution[]>(
    [],
  );
  const [users, setUsers] = useState<User[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const loadFamilies = async () => {
      try {
        const data = await api.get("/families");

        console.log("FAMILIES API:", data.families);

        const activeFamilies = (data.families || []).filter(
          (family: Family) => family.isDeleted !== true,
        );

        console.log("ACTIVE FAMILIES:", activeFamilies);
        console.log("ACTIVE FAMILIES COUNT:", activeFamilies.length);

        setFamilies(activeFamilies);
        console.log("===== CONTEXT FAMILIES =====");
        console.log("Context will store:", activeFamilies.length);
        console.log("Context families:", activeFamilies);
      } catch (error) {
        console.error("LOAD FAMILIES ERROR:", error);
      }
    };

    const loadAidTypes = async () => {
      try {
        const data = await api.get("/aid-types");
        console.log("AID TYPES API:", data.aidTypes);
        setAidTypes(data.aidTypes || []);
      } catch (error) {
        console.error("LOAD AID TYPES ERROR:", error);
      }
    };

    const loadAidDistributions = async () => {
      try {
        const data = await api.get("/aid-distributions");

        console.log("AID DISTRIBUTIONS API:", data.distributions);

        setAidDistributions(data.distributions || []);
      } catch (error) {
        console.error("LOAD DISTRIBUTIONS ERROR:", error);
      }
    };
    const loadUsers = async () => {
      try {
        const data = await api.get("/users");
        console.log("USERS API:", data.users);
        setUsers(data.users || []);
      } catch (error) {
        console.error("LOAD USERS ERROR:", error);
      }
    };

    loadUsers();
    loadFamilies();
    loadAidTypes();
    loadAidDistributions();
  }, [currentUser]);
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
        users,
        auditLogs,

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
