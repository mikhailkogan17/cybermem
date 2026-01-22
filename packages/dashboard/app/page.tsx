"use client";

import AuditLogTable from "@/components/dashboard/audit-log-table";
import ChartsSection from "@/components/dashboard/charts-section";
import DashboardHeader from "@/components/dashboard/header";
import LoginModal from "@/components/dashboard/login-modal";
import MCPConfigModal from "@/components/dashboard/mcp-config-modal";
import MetricsGrid from "@/components/dashboard/metrics-grid";
import SettingsModal from "@/components/dashboard/settings-modal";
import { useDashboard } from "@/lib/data/dashboard-context";
import { DashboardData } from "@/lib/data/types";
import { useEffect, useState } from "react";

// Types (Ideally imported, but keeping for now if used elsewhere locally, though strategy returns properly typed data)
// We use the types from lib/data/types.ts now

export default function Dashboard() {
  const {
    strategy,
    isDemo,
    toggleDemo,
    refreshSignal,
    isAuthenticated,
    login,
  } = useDashboard();

  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Data State
  const [data, setData] = useState<DashboardData>({
    stats: {
      memoryRecords: 0,
      totalClients: 0,
      successRate: 0,
      totalRequests: 0,
      topWriter: { name: "N/A", count: 0 },
      topReader: { name: "N/A", count: 0 },
      lastWriter: { name: "N/A", timestamp: 0 },
      lastReader: { name: "N/A", timestamp: 0 },
    },
    trends: {
      memory: { change: "", trend: "neutral", hasData: false, data: [] },
      clients: { change: "", trend: "neutral", hasData: false, data: [] },
      success: { change: "", trend: "neutral", hasData: false, data: [] },
      requests: { change: "", trend: "neutral", hasData: false, data: [] },
    },
    logs: [],
  });

  // Auth is handled by context (Layout passes initial state from headers)

  const handleLogin = (token: string) => {
    login();
  };

  // Fetch Data Effect - Reacts to strategy change or refresh signal
  useEffect(() => {
    async function updateData() {
      try {
        const potentialData = await strategy.fetchGlobalStats();
        setData(potentialData);
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      }
    }
    updateData();
  }, [strategy, refreshSignal]);

  // Audit Log internal state for filtering/sorting (UI logic only)
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<
    "date" | "client" | "operation" | "status"
  >("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const itemsPerPage = 10;

  const filteredLog = (data.logs || []).filter(
    (log) =>
      log.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field as any);
      setSortDirection("asc");
    }
  };

  const sortedLog = [...filteredLog].sort((a, b) => {
    const modifier = sortDirection === "asc" ? 1 : -1;
    if (sortField === "date") {
      return (
        (new Date(a.date).getTime() - new Date(b.date).getTime()) * modifier
      );
    }
    const aValue = (a as any)[sortField] || "";
    const bValue = (b as any)[sortField] || "";
    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * modifier;
    }
    return 0;
  });

  const paginatedLog = sortedLog.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalPages = Math.ceil(sortedLog.length / itemsPerPage);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return <LoginModal onLogin={handleLogin} />;
  }

  if (!mounted) {
    return null; // Return nothing on server and initial client render to avoid mismatch
  }

  return (
    <div className="min-h-screen text-foreground">
      <DashboardHeader
        onShowMCPConfig={() => setShowMCPConfig(true)}
        onShowSettings={() => setShowSettings(true)}
      />

      <main className="px-6 py-8 max-w-7xl mx-auto space-y-8">
        <MetricsGrid stats={data.stats} trends={data.trends} />
        <ChartsSection period="" />
        <AuditLogTable
          logs={(paginatedLog || []).map((log) => ({
            id: log.id,
            date: log.date.toLocaleString(),
            client: log.client,
            operation: log.operation,
            status: log.status,
            description: log.description,
          }))}
          loading={false}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </main>

      {showMCPConfig && (
        <MCPConfigModal onClose={() => setShowMCPConfig(false)} />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
