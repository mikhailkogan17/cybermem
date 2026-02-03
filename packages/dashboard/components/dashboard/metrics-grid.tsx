"use client";

import { Card, CardContent } from "@/components/ui/card";
import MetricCard from "./metrics/stat-card";

// Types
interface TrendState {
  change: string;
  trend: "up" | "down" | "neutral";
  hasData: boolean;
}

interface MetricsGridProps {
  stats: {
    memoryRecords: number;
    totalClients: number;
    successRate: number;
    totalRequests: number;
    topWriter: { name: string; count: number };
    topReader: { name: string; count: number };
    lastWriter: { name: string; timestamp: number };
    lastReader: { name: string; timestamp: number };
  };
  trends: {
    memory: TrendState;
    clients: TrendState;
    success: TrendState;
    requests: TrendState;
  };
  loading?: boolean;
}

// Client card skeleton component
function ClientCardSkeleton({ label }: { label: string }) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden">
      <CardContent className="pt-6 pb-6 relative">
        <div className="text-sm font-medium text-slate-400 mb-2">{label}</div>
        <div className="h-10 w-32 bg-white/10 rounded animate-pulse mb-2" />
        <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

// Client card with empty state
function ClientCard({
  label,
  name,
  subtitle,
  isEmpty,
  testId,
}: {
  label: string;
  name: string;
  subtitle: string;
  isEmpty: boolean;
  testId?: string;
}) {
  return (
    <Card
      className={`card bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden ${isEmpty ? "opacity-60" : ""}`}
      data-testid={testId}
    >
      <CardContent className="pt-6 pb-6 relative">
        <div className="text-sm font-medium text-slate-400 mb-2">{label}</div>
        <div
          className={`text-4xl font-bold mb-1 truncate ${isEmpty ? "text-slate-500" : "text-white"}`}
          data-testid="stat-value"
        >
          {name}
        </div>
        <div
          className={`text-xl whitespace-nowrap ${isEmpty ? "text-slate-600" : "text-white/80"}`}
        >
          {subtitle}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MetricsGrid({
  stats,
  trends,
  loading = false,
}: MetricsGridProps) {
  // Note: Client names are now normalized by backend API, no frontend transformation needed

  const formatTimestamp = (timestamp: number) => {
    if (timestamp <= 0) return "No activity";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString();
    }
    return date.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* 1. Memory Records */}
      <MetricCard
        label="Memory Records"
        value={stats.memoryRecords.toLocaleString()}
        change={trends.memory.change}
        trend={trends.memory.trend}
        hasData={trends.memory.hasData}
        loading={loading}
      />

      {/* 2. Total Clients */}
      <MetricCard
        label="Total Clients"
        value={stats.totalClients.toString()}
        change={trends.clients.change}
        trend={trends.clients.trend}
        hasData={trends.clients.hasData}
        loading={loading}
      />

      {/* 3. Success Rate */}
      <MetricCard
        label="Success Rate"
        value={`${stats.successRate.toFixed(1)}%`}
        change={trends.success.change}
        trend={trends.success.trend} // Trend UP is good (green) for success rate
        hasData={trends.success.hasData}
        loading={loading}
      />

      {/* 4. Total Requests */}
      <MetricCard
        label="Total Requests"
        value={stats.totalRequests.toLocaleString()}
        change={trends.requests.change}
        trend={trends.requests.trend}
        hasData={trends.requests.hasData}
        loading={loading}
      />

      {/* 5. Top Writer */}
      {loading ? (
        <ClientCardSkeleton label="Top Writer" />
      ) : (
        <ClientCard
          label="Top Writer"
          testId="card-top-writer"
          name={stats.topWriter.count > 0 ? stats.topWriter.name : "N/A"}
          subtitle={
            stats.topWriter.count > 0
              ? `${stats.topWriter.count.toLocaleString()} writes`
              : ""
          }
          isEmpty={stats.topWriter.count <= 0}
        />
      )}

      {/* 6. Top Reader */}
      {loading ? (
        <ClientCardSkeleton label="Top Reader" />
      ) : (
        <ClientCard
          label="Top Reader"
          testId="card-top-reader"
          name={stats.topReader.count > 0 ? stats.topReader.name : "N/A"}
          subtitle={
            stats.topReader.count > 0
              ? `${stats.topReader.count.toLocaleString()} reads`
              : ""
          }
          isEmpty={stats.topReader.count <= 0}
        />
      )}

      {/* 7. Last Writer */}
      {loading ? (
        <ClientCardSkeleton label="Last Writer" />
      ) : (
        <ClientCard
          label="Last Writer"
          testId="card-last-writer"
          name={stats.lastWriter.name !== "N/A" ? stats.lastWriter.name : "N/A"}
          subtitle={formatTimestamp(stats.lastWriter.timestamp)}
          isEmpty={
            stats.lastWriter.name === "N/A" || stats.lastWriter.timestamp <= 0
          }
        />
      )}

      {/* 8. Last Reader */}
      {loading ? (
        <ClientCardSkeleton label="Last Reader" />
      ) : (
        <ClientCard
          label="Last Reader"
          testId="card-last-reader"
          name={stats.lastReader.name !== "N/A" ? stats.lastReader.name : "N/A"}
          subtitle={formatTimestamp(stats.lastReader.timestamp)}
          isEmpty={
            stats.lastReader.name === "N/A" || stats.lastReader.timestamp <= 0
          }
        />
      )}
    </div>
  );
}
