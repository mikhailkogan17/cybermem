"use client";

import { useDashboard } from "@/lib/data/dashboard-context";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    RefreshCw,
} from "lucide-react";
import { useState } from "react";

interface AuditLogTableProps {
  logs: any[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}

const statusConfig: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  Warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  Error: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  Canceled: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
};

const periods = [
  { label: "1 Hour", value: "1h" },
  { label: "24 Hours", value: "24h" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "All Time", value: "all" },
];

export default function AuditLogTable({
  logs,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  sortField,
  sortDirection,
  onSort,
}: AuditLogTableProps) {
  const [period, setPeriod] = useState("all");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { clientConfigs } = useDashboard();

  const getClientConfig = (rawName: string) => {
    if (!rawName) return undefined;
    const nameLower = rawName.toLowerCase();
    return clientConfigs.find((c: any) =>
      new RegExp(c.match, "i").test(nameLower),
    );
  };

  const getClientDisplayName = (rawName: string) => {
    const config = getClientConfig(rawName);
    return config ? config.name : rawName;
  };

  const exportToCSV = () => {
    const headers = [
      "Timestamp",
      "Client",
      "Operation",
      "Description",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...logs.map((log) =>
        [
          `"${log.date}"`,
          `"${getClientDisplayName(log.client)}"`,
          `"${log.operation}"`,
          `"${log.description}"`,
          `"${log.status}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cybermem-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(
      logs.map((log) => ({
        timestamp: log.date,
        client: getClientDisplayName(log.client),
        operation: log.operation,
        description: log.description,
        status: log.status,
      })),
      null,
      2,
    );

    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cybermem-audit-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg p-6 transition-all duration-300">
      {/* Neomorphism glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Period Selector - Badge Style - Absolute positioned in top-right (ignoring padding) */}
      <div className="absolute top-0 right-0 z-20 group/period">
        <button className="h-8 px-3 rounded-tl-none rounded-tr-2xl rounded-bl-2xl rounded-br-none bg-white/5 border-b border-l border-white/10 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-2 transition-all">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {periods.find((p) => p.value === period)?.label}
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Dropdown Menu */}
        <div className="absolute right-0 mt-2 w-40 bg-[#0B1116]/95 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover/period:opacity-100 group-hover/period:visible transition-all duration-200 z-30 backdrop-blur-xl overflow-hidden">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                period === p.value
                  ? "bg-emerald-500/20 text-emerald-400 font-medium"
                  : "text-neutral-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-lg font-semibold text-white">Audit Log</h3>
          {loading && (
            <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
          )}
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  { label: "Timestamp", key: "date", width: "w-[200px]" },
                  { label: "Client", key: "client", width: "w-[260px]" },
                  { label: "Operation", key: "operation", width: "w-[120px]" },
                  { label: "Description", key: "description", width: "" },
                  { label: "Status", key: "status", width: "w-[120px]" },
                ].map((header) => (
                  <th
                    key={header.key}
                    onClick={() => onSort(header.key)}
                    className={`text-left py-4 px-4 font-medium text-neutral-400 cursor-pointer hover:text-white transition-colors select-none group/th ${header.width}`}
                  >
                    <div className="flex items-center gap-2">
                      {header.label}
                      <div className="flex flex-col">
                        {sortField === header.key ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-neutral-700 group-hover/th:text-neutral-500 transition-colors" />
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0
                ? // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-4 px-4">
                        <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-40 bg-white/5 rounded animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-6 w-20 bg-white/5 rounded-full animate-pulse" />
                      </td>
                    </tr>
                  ))
                : logs.map((log) => {
                    const config =
                      statusConfig[log.status] || statusConfig.Success;
                    const clientConf = getClientConfig(log.client);
                    const displayName = clientConf
                      ? clientConf.name
                      : log.client;
                    const icon = clientConf?.icon;

                    return (
                      <tr
                        key={log.id}
                        className="border-b border-white/5 hover:bg-white/10 transition-colors even:bg-white/[0.02] group/row"
                      >
                        <td className="py-4 px-4 text-neutral-300 group-hover/row:text-white transition-colors">
                          {log.date}
                        </td>
                        <td className="py-4 px-4 text-white font-medium">
                          <div className="flex items-center gap-2">
                            {icon && (
                              <img
                                src={icon}
                                alt={displayName}
                                className="w-5 h-5 object-contain"
                              />
                            )}
                            <span>{displayName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-neutral-300">
                          {log.operation}
                        </td>
                        <td className="py-4 px-4 text-neutral-400">
                          {log.description}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

              {!loading && logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-neutral-500"
                  >
                    No logs found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between relative">
          {/* Export Button (Left) */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-medium flex items-center gap-2 transition-all"
            >
              <Download className="w-3 h-3" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>

            {showExportMenu && (
              <div className="absolute left-0 bottom-full mb-2 w-32 bg-[#0B1116]/95 border border-white/10 rounded-lg shadow-xl z-30 backdrop-blur-xl overflow-hidden">
                <button
                  onClick={exportToCSV}
                  className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Export JSON
                </button>
              </div>
            )}
          </div>

          <p className="absolute left-1/2 -translate-x-1/2 text-sm text-neutral-500">
            Page {currentPage} of {Math.max(1, totalPages)}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
