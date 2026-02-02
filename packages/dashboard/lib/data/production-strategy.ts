import { DashboardData, DataSourceStrategy, TimeSeriesData } from "./types";

export class ProductionDataSource implements DataSourceStrategy {
  async fetchGlobalStats(): Promise<DashboardData> {
    const res = await fetch(`/api/metrics`);
    if (!res.ok) throw new Error("Failed to fetch metrics");
    const data = await res.json();

    const logsRes = await fetch(`/api/audit-logs`);
    const logsData = logsRes.ok ? await logsRes.json() : { logs: [] };

    // Helper to resolve logs
    const resolveOperation = (log: any) => {
      const normalizedOp = (log.operation || "").toString().toLowerCase();
      if (normalizedOp === "read") return "Read";
      if (normalizedOp === "write" || normalizedOp === "create") return "Write";
      if (normalizedOp === "update") return "Update";
      if (normalizedOp === "delete") return "Delete";
      const method = (log.method || "").toString().toUpperCase();
      if (method === "GET") return "Read";
      if (method === "DELETE") return "Delete";
      if (method === "PATCH" || method === "PUT") return "Update";
      return "Write";
    };

    const mappedLogs = (logsData.logs || []).map((log: any, index: number) => {
      const operation = resolveOperation(log);
      // Use rawStatus if available (from our API), otherwise fallback to status
      const statusCode = parseInt(log.rawStatus || log.status);
      let status = "Success";
      let description = "";
      if (statusCode >= 500) {
        status = "Error";
        description = "Server error";
      } else if (statusCode >= 400) {
        status = "Error";
        description =
          statusCode === 401
            ? "Unauthorized"
            : statusCode === 403
              ? "Forbidden"
              : "Client error";
      } else if (statusCode >= 300) {
        status = "Warning";
        description = "Redirect";
      } else if (log.status === "Error") {
        status = "Error";
        description = "Error";
      } else {
        // Success: Show method and endpoint
        const method = (log.method || "").toString().toUpperCase();
        const endpoint = log.endpoint || "";
        description = `${method} ${endpoint}`.trim();
      }

      return {
        id: index,
        date: new Date(log.timestamp),
        client: log.client || "Unknown",
        operation,
        status,
        description,
        timestamp: new Date(log.timestamp).getTime(),
      };
    });

    // Calculate Latest & Tops from logs if available
    const sortedByDate = [...mappedLogs].sort(
      (a, b) => b.timestamp - a.timestamp,
    );

    // Writers
    const wLog = sortedByDate.find((l) =>
      ["Write", "Update", "Delete", "Create"].includes(l.operation),
    );
    const lastWriter = wLog
      ? { name: wLog.client, timestamp: wLog.timestamp }
      : { name: "N/A", timestamp: 0 };

    // Readers
    const rLog = sortedByDate.find((l) => l.operation === "Read");
    const lastReader = rLog
      ? { name: rLog.client, timestamp: rLog.timestamp }
      : { name: "N/A", timestamp: 0 };

    // Tops
    const writerCounts: Record<string, number> = {};
    const readerCounts: Record<string, number> = {};
    mappedLogs.forEach((log: any) => {
      if (["Write", "Update", "Delete", "Create"].includes(log.operation)) {
        writerCounts[log.client] = (writerCounts[log.client] || 0) + 1;
      } else if (log.operation === "Read") {
        readerCounts[log.client] = (readerCounts[log.client] || 0) + 1;
      }
    });
    const getTop = (counts: Record<string, number>) => {
      const entries = Object.entries(counts);
      if (entries.length === 0) return { name: "N/A", count: 0 };
      entries.sort((a, b) => b[1] - a[1]);
      return { name: entries[0][0], count: entries[0][1] };
    };

    const topWriter = logsRes.ok
      ? getTop(writerCounts)
      : (data.stats.topWriter ?? { name: "N/A", count: 0 });
    const topReader = logsRes.ok
      ? getTop(readerCounts)
      : (data.stats.topReader ?? { name: "N/A", count: 0 });

    // Trends calculation
    const calculateTrend = (series: number[]) => {
      if (!series || series.length < 2)
        return {
          change: "0",
          trend: "neutral" as const,
          hasData: false,
          data: [],
        };
      const first = series[0];
      const last = series[series.length - 1];
      const diff = last - first;
      const prefix = diff > 0 ? "+" : "";
      return {
        change: `${prefix}${diff.toLocaleString()}`,
        trend: (diff > 0 ? "up" : diff < 0 ? "down" : "neutral") as
          | "up"
          | "down"
          | "neutral",
        hasData: true,
        data: series,
      };
    };

    // Success Rate Trend
    let successTrend = {
      change: "0%",
      trend: "neutral" as "neutral" | "up" | "down",
      hasData: false,
      data: [] as number[],
    };
    if (data.sparklines?.successRate) {
      const sData = data.sparklines.successRate;
      const sFirst = sData[0] || 0;
      const sLast = sData[sData.length - 1] || 0;
      const sDiff = sLast - sFirst;
      successTrend = {
        change: `${sDiff > 0 ? "+" : ""}${sDiff.toFixed(1)}%`,
        trend: sDiff >= 0 ? "up" : "down",
        hasData: true,
        data: sData,
      };
    }

    return {
      stats: {
        memoryRecords: data.stats.memoryRecords ?? 0,
        totalClients: data.stats.totalClients ?? 0,
        successRate: data.stats.successRate ?? 0,
        totalRequests: data.stats.totalRequests ?? 0,
        topWriter,
        topReader,
        lastWriter,
        lastReader,
      },
      trends: {
        memory: calculateTrend(data.sparklines?.memoryRecords || []),
        clients: calculateTrend(data.sparklines?.totalClients || []),
        success: successTrend,
        requests: calculateTrend(data.sparklines?.totalRequests || []),
      },
      logs: mappedLogs,
    };
  }

  async getChartData(period: string): Promise<TimeSeriesData> {
    const res = await fetch(`/api/metrics?period=${period}`, {
      headers: { "X-Client-Name": "dashboard" },
    });
    if (!res.ok) throw new Error("Failed to fetch chart data");
    const apiData = await res.json();

    // Fetch clients metadata separately or use what's in apiData
    // Ideally we merge them here
    let metadata = {};
    if (apiData.metadata) {
      metadata = apiData.metadata;
    }

    // apiData.timeSeries needs to be returned.
    return {
      creates: apiData.timeSeries?.creates || [],
      reads: apiData.timeSeries?.reads || [],
      updates: apiData.timeSeries?.updates || [],
      deletes: apiData.timeSeries?.deletes || [],
      metadata,
    };
  }
}
