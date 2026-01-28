"use client";

import AuditLogTable from "@/components/dashboard/audit-log-table";
import ChartsSection from "@/components/dashboard/charts-section";
import DashboardHeader from "@/components/dashboard/header";
import MCPConfigModal from "@/components/dashboard/mcp-config-modal";
import MetricsGrid from "@/components/dashboard/metrics-grid";
import SettingsModal from "@/components/dashboard/settings-modal";
import { useDashboard } from "@/lib/data/dashboard-context";
import { DashboardData } from "@/lib/data/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { strategy, refreshSignal } = useDashboard();
  const [data, setData] = useState<DashboardData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const params = useSearchParams();
  const router = useRouter();

  const pageSize = 10;

  useEffect(() => {
    async function fetchData() {
      try {
        const stats = await strategy.fetchGlobalStats();
        setData(stats);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    }
    fetchData();
  }, [strategy, refreshSignal]);

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
  const sortedLogs = data?.logs
    ? [...data.logs].sort((a: any, b: any) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      })
    : [];

  const paginatedLogs = sortedLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Transform data for MetricsGrid
  const metricsStats = data
    ? {
        memoryRecords: data.stats.memoryRecords,
        totalClients: data.stats.totalClients,
        successRate: data.stats.successRate,
        totalRequests: data.stats.totalRequests,
        topWriter: data.stats.topWriter,
        topReader: data.stats.topReader,
        lastWriter: data.stats.lastWriter,
        lastReader: data.stats.lastReader,
      }
    : {
        memoryRecords: 0,
        totalClients: 0,
        successRate: 0,
        totalRequests: 0,
        topWriter: { name: "N/A", count: 0 },
        topReader: { name: "N/A", count: 0 },
        lastWriter: { name: "N/A", timestamp: 0 },
        lastReader: { name: "N/A", timestamp: 0 },
      };

  const metricsTrends = data
    ? data.trends
    : {
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

  return (
    <main className="min-h-screen bg-[#0B1116] text-white">
      <DashboardHeader
        onShowSettings={() => setShowSettings(true)}
        onShowMCPConfig={() => setShowMCPConfig(true)}
        memoryCount={data?.stats.memoryRecords || 0}
      />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 space-y-12 animate-in fade-in duration-700">
        <MetricsGrid
          stats={metricsStats}
          trends={metricsTrends}
          loading={!data}
        />
        <ChartsSection period="all" />
        <AuditLogTable
          logs={paginatedLogs}
          loading={!data}
          currentPage={currentPage}
          totalPages={Math.ceil((data?.logs.length || 0) / pageSize)}
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
