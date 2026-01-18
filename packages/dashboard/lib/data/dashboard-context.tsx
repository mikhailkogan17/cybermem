"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DemoDataSource } from "./demo-strategy";
import { ProductionDataSource } from "./production-strategy";
import { DataSourceStrategy } from "./types";

interface ClientConfig {
  id: string;
  name: string;
  match: string;
  color: string;
  icon: string | null;
  description: string;
  steps: string[];
  configType: string;
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
  strategy: DataSourceStrategy;
  isDemo: boolean;
  toggleDemo: () => void;
  refreshSignal: number;
  clientConfigs: ClientConfig[];
  systemHealth: SystemHealth | null;
  isAuthenticated: boolean;
  login: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

export function DashboardProvider({
  children,
  initialAuth = false,
}: {
  children: React.ReactNode;
  initialAuth?: boolean;
}) {
  const [isDemo, setIsDemo] = useState(false);
  const [strategy, setStrategy] = useState<DataSourceStrategy>(
    new ProductionDataSource(),
  );
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [clientConfigs, setClientConfigs] = useState<ClientConfig[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);

  // Load configuration on mount
  useEffect(() => {
    // Load client config
    fetch("/clients.json")
      .then((res) => res.json())
      .then((data) => setClientConfigs(data))
      .catch((err) => console.error("Failed to load client configs:", err));

    // Check session storage
    if (sessionStorage.getItem("authenticated") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Check system health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health", {
          signal: AbortSignal.timeout(5000),
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
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const toggleDemo = () => {
    const newState = !isDemo;
    setIsDemo(newState);
    setStrategy(newState ? new DemoDataSource() : new ProductionDataSource());
    setRefreshSignal((prev) => prev + 1);
  };

  const login = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem("authenticated", "true");
  };

  // Refresh data periodically (centralized trigger)
  useEffect(() => {
    if (isDemo) return; // No auto-refresh in Demo Mode (static data)

    const interval = setInterval(() => {
      setRefreshSignal((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [isDemo]);

  return (
    <DashboardContext.Provider
      value={{
        strategy,
        isDemo,
        toggleDemo,
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
