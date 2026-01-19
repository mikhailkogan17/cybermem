import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Use env var for db-exporter URL (Docker internal vs local dev)
const DB_EXPORTER_URL = process.env.DB_EXPORTER_URL || "http://localhost:8000";
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://localhost:9092";

// Load clients config for name normalization
let clientsConfig: any[] = [];
try {
  const configPath = path.join(process.cwd(), "public", "clients.json");
  clientsConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (e) {
  console.error("Failed to load clients.json:", e);
}

// Normalize raw client name to friendly name
function normalizeClientName(rawName: string): string {
  if (!rawName || rawName === "N/A") return rawName;
  const nameLower = rawName.toLowerCase();
  const client = clientsConfig.find((c: any) => {
    try {
      return new RegExp(c.match, "i").test(nameLower);
    } catch {
      return nameLower.includes(c.match);
    }
  });
  return client?.name || rawName;
}

// Normalize client names in time series data
function normalizeTimeSeries(data: any[]): any[] {
  return data.map((point) => {
    const normalized: any = { time: point.time };
    for (const [key, value] of Object.entries(point)) {
      if (key !== "time") {
        const normalizedKey = normalizeClientName(key);
        normalized[normalizedKey] = value;
      }
    }
    return normalized;
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "24h";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // --- PRIMARY DATA SOURCE: DIRECT SQLITE ---
    let stats = {
      memoryRecords: 0,
      totalClients: 0,
      successRate: 100,
      totalRequests: 0,
      topWriter: { name: "N/A", count: 0 },
      topReader: { name: "N/A", count: 0 },
      lastWriter: { name: "N/A", timestamp: 0 },
      lastReader: { name: "N/A", timestamp: 0 },
    };
    let timeseries: Record<string, any[]> = {
      creates: [],
      reads: [],
      updates: [],
      deletes: [],
    };

    const homedir = process.env.HOME || process.env.USERPROFILE || "";
    const dbPath =
      process.env.OM_DB_PATH ||
      path.resolve(homedir, ".cybermem/data/openmemory.sqlite");

    if (fs.existsSync(dbPath)) {
      console.error(`[STATS-API] Reading SQLite from ${dbPath}`);
      try {
        const sqlite3 = require("sqlite3").verbose();
        const { open } = require("sqlite");
        const db = await open({
          filename: dbPath,
          driver: sqlite3.Database,
        });

        // Basic Stats
        const memories = await db.get("SELECT COUNT(*) as count FROM memories");
        const totalReqs = await db.get(
          "SELECT COUNT(*) as count FROM cybermem_access_log",
        );
        const errReqs = await db.get(
          "SELECT COUNT(*) as count FROM cybermem_access_log WHERE is_error = 1",
        );
        const lastWrite = await db.get(
          "SELECT client_name, timestamp FROM cybermem_access_log WHERE operation = 'create' ORDER BY timestamp DESC LIMIT 1",
        );
        const lastRead = await db.get(
          "SELECT client_name, timestamp FROM cybermem_access_log WHERE operation = 'read' ORDER BY timestamp DESC LIMIT 1",
        );
        const uniqueClients = await db.get(
          "SELECT COUNT(DISTINCT client_name) as count FROM cybermem_access_log",
        );

        stats.memoryRecords = memories?.count || 0;
        stats.totalRequests = totalReqs?.count || 0;
        stats.totalClients = uniqueClients?.count || 0;
        stats.successRate =
          stats.totalRequests > 0
            ? ((stats.totalRequests - (errReqs?.count || 0)) /
                stats.totalRequests) *
              100
            : 100;

        console.error(
          `[STATS-API] SQLite stats: ${stats.totalRequests} total requests, ${stats.memoryRecords} records`,
        );

        if (lastWrite) {
          stats.lastWriter = {
            name: normalizeClientName(lastWrite.client_name),
            timestamp: lastWrite.timestamp,
          };
          console.error(`[STATS-API] Last writer: ${stats.lastWriter.name}`);
        }
        if (lastRead) {
          stats.lastReader = {
            name: normalizeClientName(lastRead.client_name),
            timestamp: lastRead.timestamp,
          };
          console.error(`[STATS-API] Last reader: ${stats.lastReader.name}`);
        }

        // Top activity
        const topWriter = await db.get(
          "SELECT client_name, COUNT(*) as count FROM cybermem_access_log WHERE operation = 'create' GROUP BY client_name ORDER BY count DESC LIMIT 1",
        );
        const topReader = await db.get(
          "SELECT client_name, COUNT(*) as count FROM cybermem_access_log WHERE operation = 'read' GROUP BY client_name ORDER BY count DESC LIMIT 1",
        );

        if (topWriter)
          stats.topWriter = {
            name: normalizeClientName(topWriter.client_name),
            count: topWriter.count,
          };
        if (topReader)
          stats.topReader = {
            name: normalizeClientName(topReader.client_name),
            count: topReader.count,
          };

        // --- TIME SERIES AGGREGATION (Robust Linear Sampling) ---
        let periodMs = 24 * 60 * 60 * 1000; // Default 24h
        if (period === "1h") periodMs = 60 * 60 * 1000;
        else if (period === "7d") periodMs = 7 * 24 * 60 * 60 * 1000;
        else if (period === "30d") periodMs = 30 * 24 * 60 * 60 * 1000;
        else if (period === "90d") periodMs = 90 * 24 * 60 * 60 * 1000;
        else if (period === "24h") periodMs = 24 * 60 * 60 * 1000;

        const now = Date.now();
        const startTime = now - periodMs;

        console.error(
          `[STATS-API] Fetching cumulative chart data since ${new Date(startTime).toISOString()}`,
        );

        // Get all logs in period
        const allLogs = await db.all(
          `
          SELECT timestamp, operation, client_name
          FROM cybermem_access_log
          WHERE timestamp > ?
          ORDER BY timestamp ASC
        `,
          [startTime],
        );

        // Get base counts (before startTime) to start the cumulative graph correctly
        const baseCounts = await db.all(
          `
          SELECT operation, client_name, COUNT(*) as count
          FROM cybermem_access_log
          WHERE timestamp <= ?
          GROUP BY 1, 2
        `,
          [startTime],
        );

        const buildBeautifulSeries = (targetOp: string) => {
          const clientTotals: Record<string, number> = {};

          // 1. Initialize with base counts
          baseCounts
            .filter((b: any) => b.operation === targetOp)
            .forEach((b: any) => {
              clientTotals[b.client_name] = b.count;
            });

          const series: any[] = [];
          const opLogs = allLogs.filter((l: any) => l.operation === targetOp);

          // 2. Linear Sampling (60 points)
          const SAMPLES = 60;
          const interval = (now - startTime) / SAMPLES;
          let currentLogIdx = 0;

          for (let i = 0; i <= SAMPLES; i++) {
            const timePoint = startTime + i * interval;

            // Catch up logs that happened before this timePoint
            while (
              currentLogIdx < opLogs.length &&
              opLogs[currentLogIdx].timestamp <= timePoint
            ) {
              const log = opLogs[currentLogIdx];
              clientTotals[log.client_name] =
                (clientTotals[log.client_name] || 0) + 1;
              currentLogIdx++;
            }

            // Record state at this exact linear time point
            series.push({
              time: Math.floor(timePoint / 1000),
              ...clientTotals,
            });
          }

          return series;
        };

        timeseries.creates = buildBeautifulSeries("create");
        timeseries.reads = buildBeautifulSeries("read");
        timeseries.updates = buildBeautifulSeries("update");
        timeseries.deletes = buildBeautifulSeries("delete");

        console.error(`[STATS-API] SQLite Stats & Beautiful Charts processed.`);

        await db.close();
      } catch (dbErr) {
        console.error("[STATS-API] Direct SQLite metrics fetch failed:", dbErr);
      }
    } else {
      console.error(`[STATS-API] SQLite DB NOT FOUND at ${dbPath}`);
    }

    clearTimeout(timeoutId);

    // --- PROMETHEUS FETCHING ---
    const fetchProm = async (query: string) => {
      try {
        const res = await fetch(
          `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!res.ok) return null;
        const json = await res.json();
        return json.data?.result?.[0]?.value?.[1];
      } catch (e) {
        return null;
      }
    };

    const fetchPromRange = async (
      query: string,
      start: number,
      end: number,
      step: number,
    ) => {
      try {
        const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start / 1000}&end=${end / 1000}&step=${step}`;
        const res = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data?.result || [];
      } catch (e) {
        return null;
      }
    };

    // Parallel fetch of Instant stats AND Range stats
    const [
      promMemories,
      promClients,
      promRequests,
      promSuccess,
      promSeriesCreates,
      promSeriesReads,
      promSeriesUpdates,
      promSeriesDeletes,
    ] = await Promise.all([
      fetchProm("openmemory_memories_total"),
      fetchProm("count(count by(client_name) (openmemory_requests_total))"),
      fetchProm("openmemory_requests_aggregate_total"),
      fetchProm("openmemory_success_rate_aggregate"),
      // Range queries (step calculated based on period)
      fetchPromRange(
        'sum(increase(cybermem_access_log_total{operation="create"}[5m])) by (client_name)',
        Date.now() - (period === "24h" ? 86400000 : 604800000),
        Date.now(),
        period === "24h" ? 1800 : 7200, // 30m or 2h steps
      ),
      fetchPromRange(
        'sum(increase(cybermem_access_log_total{operation="read"}[5m])) by (client_name)',
        Date.now() - (period === "24h" ? 86400000 : 604800000),
        Date.now(),
        period === "24h" ? 1800 : 7200,
      ),
      fetchPromRange(
        'sum(increase(cybermem_access_log_total{operation="update"}[5m])) by (client_name)',
        Date.now() - (period === "24h" ? 86400000 : 604800000),
        Date.now(),
        period === "24h" ? 1800 : 7200,
      ),
      fetchPromRange(
        'sum(increase(cybermem_access_log_total{operation="delete"}[5m])) by (client_name)',
        Date.now() - (period === "24h" ? 86400000 : 604800000),
        Date.now(),
        period === "24h" ? 1800 : 7200,
      ),
    ]);

    // Process Prometheus Range Data into Chart Format
    const processPromSeries = (promResult: any[]) => {
      if (!promResult || promResult.length === 0) return null;

      // Map mapping timestamp -> { client: value }
      const timeMap = new Map<number, any>();

      promResult.forEach((series: any) => {
        const client = series.metric.client_name || "Unknown";
        series.values.forEach(([time, val]: any[]) => {
          const t = time; // Prometheus time is already seconds
          if (!timeMap.has(t)) timeMap.set(t, { time: t });
          const entry = timeMap.get(t);
          entry[client] = (entry[client] || 0) + parseFloat(val);
        });
      });

      return Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
    };

    // Override SQLite timeseries if Prometheus data is available
    if (promSeriesCreates)
      timeseries.creates =
        processPromSeries(promSeriesCreates) || timeseries.creates;
    if (promSeriesReads)
      timeseries.reads = processPromSeries(promSeriesReads) || timeseries.reads;
    if (promSeriesUpdates)
      timeseries.updates =
        processPromSeries(promSeriesUpdates) || timeseries.updates;
    if (promSeriesDeletes)
      timeseries.deletes =
        processPromSeries(promSeriesDeletes) || timeseries.deletes;

    // Normalize stats with explicit metrics logic
    // We prioritize SQLite (stats) for activity, and Prometheus for total records if available
    const normalizedStats = {
      memoryRecords: Math.max(
        stats.memoryRecords,
        promMemories ? parseInt(promMemories) : 0,
      ),
      totalClients: Math.max(
        stats.totalClients,
        promClients ? parseInt(promClients) : 0,
      ),
      successRate:
        stats.totalRequests > 0
          ? stats.successRate
          : promSuccess
            ? parseFloat(promSuccess)
            : 100,
      totalRequests: Math.max(
        stats.totalRequests,
        promRequests ? parseInt(promRequests) : 0,
      ),
      topWriter: {
        name: normalizeClientName(stats.topWriter?.name || "N/A"),
        count: stats.topWriter?.count || 0,
      },
      topReader: {
        name: normalizeClientName(stats.topReader?.name || "N/A"),
        count: stats.topReader?.count || 0,
      },
      lastWriter: {
        name: normalizeClientName(stats.lastWriter?.name || "N/A"),
        timestamp: stats.lastWriter?.timestamp || 0,
      },
      lastReader: {
        name: normalizeClientName(stats.lastReader?.name || "N/A"),
        timestamp: stats.lastReader?.timestamp || 0,
      },
    };

    return NextResponse.json({
      stats: normalizedStats,
      timeSeries: {
        creates: normalizeTimeSeries(timeseries.creates || []),
        reads: normalizeTimeSeries(timeseries.reads || []),
        updates: normalizeTimeSeries(timeseries.updates || []),
        deletes: normalizeTimeSeries(timeseries.deletes || []),
      },
    });
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
