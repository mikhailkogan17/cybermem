"use client"

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

interface AuditLogTableProps {
  logs: any[]
  loading: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  Success: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  Warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  Error: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  Canceled: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
}

export default function AuditLogTable({ logs, loading, currentPage, totalPages, onPageChange }: AuditLogTableProps) {

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg p-6 transition-all duration-300">
      {/* Neomorphism glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Audit Log</h3>
            {loading && <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />}
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-neutral-400">Timestamp</th>
                <th className="text-left py-4 px-4 font-medium text-neutral-400">Client</th>
                <th className="text-left py-4 px-4 font-medium text-neutral-400">Operation</th>
                <th className="text-left py-4 px-4 font-medium text-neutral-400">Status</th>
                <th className="text-left py-4 px-4 font-medium text-neutral-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                          <td className="py-4 px-4"><div className="h-4 w-32 bg-white/5 rounded animate-pulse" /></td>
                          <td className="py-4 px-4"><div className="h-4 w-24 bg-white/5 rounded animate-pulse" /></td>
                          <td className="py-4 px-4"><div className="h-4 w-16 bg-white/5 rounded animate-pulse" /></td>
                          <td className="py-4 px-4"><div className="h-6 w-20 bg-white/5 rounded-full animate-pulse" /></td>
                          <td className="py-4 px-4"><div className="h-4 w-40 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                  ))
              ) : (
                logs.map((log) => {
                    const config = statusConfig[log.status] || statusConfig.Success
                    return (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 text-neutral-300">{log.date}</td>
                            <td className="py-4 px-4 text-white font-medium">{log.client}</td>
                            <td className="py-4 px-4 text-neutral-300">{log.operation}</td>
                            <td className="py-4 px-4">
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
                            >
                                {log.status}
                            </span>
                            </td>
                            <td className="py-4 px-4 text-neutral-400">{log.description}</td>
                        </tr>
                    )
                })
              )}

              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500">
                    No logs found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
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
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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
  )
}
