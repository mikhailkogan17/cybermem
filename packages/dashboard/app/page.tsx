"use client";

import ChartsSection from "@/components/dashboard/charts-section";
import DashboardHeader from "@/components/dashboard/header";
import LogViewer from "@/components/dashboard/logs/log-viewer";
import MCPConfigModal from "@/components/dashboard/mcp-config-modal";
import MetricsGrid from "@/components/dashboard/metrics-grid";
import SettingsModal from "@/components/dashboard/settings-modal";
import { useDashboard } from "@/lib/data/dashboard-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { stats, logs, loading, refresh, timeSeries } = useDashboard();
  const [showSettings, setShowSettings] = useState(false);
  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const params = useSearchParams();
  const router = useRouter();
  const pageSize = 10;

  useEffect(() => {
    // Handle login toast
    if (params.get("logged_in") === "true") {
      toast.success("Welcome back, Mikhail!", {
        description: "Authenticated via GitHub Zero Trust",
      });
      // Clean URL
      const newParams = new URLSearchParams(params.toString());
      newParams.delete("logged_in");
      router.replace(`/?${newParams.toString()}`);
    }
  }, [params, router]);

  // Handle sorting locally for now since we have a limited set (100 logs)
  const sortedLogs = [...logs].sort((a: any, b: any) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedLogs = sortedLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Default trends (until backend provides them or we calculate them)
  const metricsTrends = {
    memory: {
      change: "0%",
      trend: "neutral" as const,
      hasData: false,
      data: [],
    },
    clients: {
      change: "0%",
      trend: "neutral" as const,
      hasData: false,
      data: [],
    },
    success: {
      change: "0%",
      trend: "neutral" as const,
      hasData: false,
      data: [],
    },
    requests: {
      change: "0%",
      trend: "neutral" as const,
      hasData: false,
      data: [],
    },
  };

  const currentStats = stats || {
    memoryRecords: 0,
    totalClients: 0,
    successRate: 0,
    totalRequests: 0,
    topWriter: { name: "N/A", count: 0 },
    topReader: { name: "N/A", count: 0 },
    lastWriter: { name: "N/A", timestamp: 0 },
    lastReader: { name: "N/A", timestamp: 0 },
  };

  return (
    <main className="min-h-screen bg-[#0B1116] text-white">
      <DashboardHeader
        onShowSettings={() => setShowSettings(true)}
        onShowMCPConfig={() => setShowMCPConfig(true)}
        memoryCount={currentStats.memoryRecords}
      />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 space-y-12 animate-in fade-in duration-700">
        <MetricsGrid
          stats={currentStats}
          trends={metricsTrends}
          loading={loading}
        />
        <ChartsSection period="all" />
        <LogViewer
          logs={paginatedLogs}
          loading={loading}
          currentPage={currentPage}
          totalPages={Math.ceil(logs.length / pageSize)}
          onPageChange={setCurrentPage}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={(field) => {
            if (field === sortField) {
              setSortDirection(sortDirection === "asc" ? "desc" : "asc");
            } else {
              setSortField(field);
              setSortDirection("desc");
            }
          }}
        />
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showMCPConfig && (
        <MCPConfigModal onClose={() => setShowMCPConfig(false)} />
      )}
    </main>
  );
}
