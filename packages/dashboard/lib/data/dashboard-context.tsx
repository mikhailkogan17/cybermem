"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { AuditLogEntry, DashboardStats } from "./types";

interface ClientConfig {
  id: string;
  name: string;
  match: string;
  color: string;
  icon: string | null;
  description: string;
  steps: string[];
  configType: string;
  isComingSoon?: boolean;
  path?: string;
}

interface ServiceStatus {
  name: string;
  status: "ok" | "error" | "warning";
  message?: string;
  latencyMs?: number;
}

interface SystemHealth {
  overall: "ok" | "degraded" | "error";
  services: ServiceStatus[];
  timestamp: string;
}

interface DashboardContextType {
  stats: DashboardStats | null;
  logs: AuditLogEntry[];
  loading: boolean;
  isDemo: boolean;
  toggleDemo: () => void;
  refresh: () => Promise<void>;
  refreshSignal: number;
  clientConfigs: ClientConfig[];
  systemHealth: SystemHealth | null;
  isAuthenticated: boolean;
  login: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

const DEMO_STATS: DashboardStats = {
  memoryRecords: 1337,
  totalClients: 5,
  successRate: 98.5,
  totalRequests: 1500,
  topWriter: { name: "Antigravity", count: 420 },
  topReader: { name: "Claude", count: 310 },
  lastWriter: { name: "Antigravity", timestamp: Date.now() - 120000 },
  lastReader: { name: "Claude", timestamp: Date.now() - 60000 },
};

const DEMO_LOGS: AuditLogEntry[] = [
  {
    id: 1,
    date: new Date().toISOString(),
    client: "Antigravity",
    operation: "Write",
    description: "POST /add",
    status: "Success",
    timestamp: Date.now(),
  },
  {
    id: 2,
    date: new Date(Date.now() - 60000).toISOString(),
    client: "Claude",
    operation: "Read",
    description: "POST /query",
    status: "Success",
    timestamp: Date.now() - 60000,
  },
];

export function DashboardProvider({
  children,
  initialAuth = false,
}: {
  children: React.ReactNode;
  initialAuth?: boolean;
}) {
  const [isDemo, setIsDemo] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [clientConfigs, setClientConfigs] = useState<ClientConfig[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);

  const fetchFullData = useCallback(async () => {
    if (isDemo) {
      setStats(DEMO_STATS);
      setLogs(DEMO_LOGS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [metricsRes, logsRes] = await Promise.all([
        fetch("/api/metrics"),
        fetch("/api/audit-logs"),
      ]);

      if (metricsRes.ok) {
        const metrics = await metricsRes.json();
        setStats(metrics.stats);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
      setRefreshSignal((s) => s + 1);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  // Load configuration on mount
  useEffect(() => {
    fetch("/clients.json")
      .then((res) => res.json())
      .then((data) => setClientConfigs(data))
      .catch((err) => console.error("Failed to load client configs:", err));

    if (sessionStorage.getItem("authenticated") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Check system health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health", {
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          setSystemHealth(data);
        } else {
          setSystemHealth({
            overall: "error",
            services: [
              {
                name: "Dashboard API",
                status: "error",
                message: `HTTP ${res.status}`,
              },
            ],
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error: any) {
        setSystemHealth({
          overall: "error",
          services: [
            {
              name: "Dashboard API",
              status: "error",
              message: error.message || "Connection failed",
            },
          ],
          timestamp: new Date().toISOString(),
        });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchFullData();
    if (!isDemo) {
      const interval = setInterval(fetchFullData, 10000); // Slower refresh for metrics
      return () => clearInterval(interval);
    }
  }, [isDemo, fetchFullData]);

  const toggleDemo = () => setIsDemo(!isDemo);

  const login = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem("authenticated", "true");
  };

  return (
    <DashboardContext.Provider
      value={{
        stats,
        logs,
        loading,
        isDemo,
        toggleDemo,
        refresh: fetchFullData,
        refreshSignal,
        clientConfigs,
        systemHealth,
        isAuthenticated,
        login,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
