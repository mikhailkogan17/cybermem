"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/lib/data/dashboard-context";
import { ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Pre-built demo timeseries (24h, 3 clients, cumulative counts)
const DEMO_CLIENT_NAMES = ["VS Code", "Gemini", "Perplexity"];
const DEMO_TIME_SERIES = (() => {
  const now = Date.now();
  const POINTS = 24;
  const makeHour = (i: number) => {
    const t = new Date(now - (POINTS - 1 - i) * 3600000);
    return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  type Row = Record<string, number | string>;
  const makeSeries = (c: number[], g: number[], p: number[]): Row[] =>
    Array.from({ length: POINTS }, (_, i) => ({
      time: makeHour(i),
      "VS Code": c[i],
      Gemini: g[i],
      Perplexity: p[i],
    }));
  // Creates
  const cC = [
    20, 21, 22, 22, 22, 23, 25, 28, 32, 38, 44, 51, 58, 63, 67, 70, 74, 79, 84,
    88, 89, 89, 89, 89,
  ];
  const gC = [
    8, 8, 8, 8, 8, 9, 10, 12, 14, 17, 20, 23, 27, 29, 31, 33, 35, 36, 36, 36,
    36, 36, 36, 36,
  ];
  const pC = [
    15, 15, 15, 15, 16, 16, 18, 21, 24, 28, 32, 37, 43, 47, 50, 54, 58, 62, 64,
    65, 65, 65, 65, 65,
  ];
  // Reads
  const cR = [
    45, 47, 48, 49, 50, 52, 56, 62, 70, 79, 89, 100, 112, 121, 128, 134, 140,
    147, 153, 157, 160, 162, 163, 163,
  ];
  const gR = [
    20, 20, 21, 21, 22, 23, 25, 28, 31, 35, 40, 46, 52, 57, 60, 63, 66, 68, 70,
    72, 73, 73, 73, 73,
  ];
  const pR = [
    30, 31, 31, 32, 32, 34, 37, 42, 48, 55, 63, 72, 81, 88, 93, 98, 103, 108,
    112, 115, 116, 117, 117, 117,
  ];
  // Updates
  const cU = [
    5, 5, 5, 5, 5, 5, 6, 7, 8, 9, 11, 13, 15, 16, 17, 18, 19, 20, 21, 22, 22,
    22, 22, 22,
  ];
  const gU = [
    2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6, 7, 7, 8, 8, 9, 9, 10, 10, 10, 10, 10,
    10,
  ];
  const pU = [
    3, 3, 3, 3, 3, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 11, 12, 12, 13, 13, 14, 14,
    14, 14,
  ];
  // Deletes
  const cD = [
    1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4,
  ];
  const gD = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2,
  ];
  const pD = [
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3,
  ];
  return {
    creates: makeSeries(cC, gC, pC),
    reads: makeSeries(cR, gR, pR),
    updates: makeSeries(cU, gU, pU),
    deletes: makeSeries(cD, gD, pD),
  };
})();

// Dynamic import with SSR disabled
const MemoryChart = dynamic(() => import("./memory-chart"), { ssr: false });

interface ChartCardProps {
  service: string;
}

// Fallback color generator
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }
  return color;
}

const periods = [
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export default function ChartCard({ service }: ChartCardProps) {
  const { refreshSignal, clientConfigs, isDemo } = useDashboard();
  const [period, setPeriod] = useState("24h");
  const [hovered, setHovered] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [clientMetadata, setClientMetadata] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const isInitialLoad = useRef(true);
  useEffect(() => {
    async function fetchData() {
      if (isInitialLoad.current) setLoading(true);

      // Demo mode: use static fake data, skip network fetch
      if (isDemo) {
        const key = service.includes("Creates")
          ? "creates"
          : service.includes("Reads")
          ? "reads"
          : service.includes("Updates")
          ? "updates"
          : "deletes";
        setData(DEMO_TIME_SERIES[key] as any[]);
        setClientNames(DEMO_CLIENT_NAMES);
        setLoading(false);
        isInitialLoad.current = false;
        return;
      }

      try {
        const res = await fetch(`/api/metrics?period=${period}`);
        if (!res.ok) throw new Error("Failed to fetch metrics");
        const metrics = await res.json();
        const timeSeriesData = metrics.timeSeries;

        // Update client metadata if provided in response
        if (metrics.metadata) {
          setClientMetadata((prev) => ({
            ...prev,
            ...metrics.metadata,
          }));
        }

        // Helper to format time based on period
        const formatSeries = (series: any[]) => {
          if (!series) return [];
          return series.map((point: any) => {
            const date = new Date((point.time as number) * 1000);
            let timeStr = "";
            if (["7d", "30d", "90d", "all"].includes(period)) {
              timeStr =
                date.toLocaleDateString([], {
                  month: "2-digit",
                  day: "2-digit",
                }) +
                " " +
                date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
            } else {
              timeStr = date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            }
            return { ...point, time: timeStr };
          });
        };

        const getClients = (series: any[]) => {
          if (!series || series.length === 0) return [];
          const keys = new Set<string>();
          const totals: Record<string, number> = {};
          series.forEach((point) => {
            Object.keys(point).forEach((k) => {
              if (k !== "time") {
                keys.add(k);
                totals[k] = (totals[k] || 0) + (point[k] as number);
              }
            });
          });
          return Array.from(keys).sort(
            (a, b) => (totals[a] || 0) - (totals[b] || 0),
          );
        };

        let seriesData: any[] = [];
        let clients: string[] = [];

        if (service.includes("Creates")) {
          seriesData = formatSeries(timeSeriesData.creates);
          clients = getClients(timeSeriesData.creates);
        } else if (service.includes("Reads")) {
          seriesData = formatSeries(timeSeriesData.reads);
          clients = getClients(timeSeriesData.reads);
        } else if (service.includes("Updates")) {
          seriesData = formatSeries(timeSeriesData.updates);
          clients = getClients(timeSeriesData.updates);
        } else if (service.includes("Deletes")) {
          seriesData = formatSeries(timeSeriesData.deletes);
          clients = getClients(timeSeriesData.deletes);
        }

        setData(seriesData);
        setClientNames(clients);
      } catch (e) {
        console.error("Failed to fetch chart data:", e);
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }
    fetchData();
  }, [period, service, refreshSignal, isDemo]);

  const isMultiSeries = clientNames.length > 0;

  return (
    <Card className="card bg-white/5 border-white/10 backdrop-blur-md relative overflow-visible pt-6 pb-2">
      <button
        className="absolute top-0 right-0 z-20 h-8 px-3 rounded-tl-none rounded-tr-xl rounded-bl-2xl rounded-br-none bg-white/5 border-b border-l border-white/10 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-2 transition-all group"
        onClick={() =>
          document
            .getElementById(`dropdown-${service}`)
            ?.classList.toggle("hidden")
        }
      >
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

      {/* Dropdown Menu - Positioned relative to the button or card */}
      <div
        id={`dropdown-${service}`}
        className="hidden absolute top-8 right-0 w-40 bg-[#0B1116]/95 border border-white/10 rounded-lg shadow-xl z-30 backdrop-blur-xl overflow-hidden"
      >
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => {
              setPeriod(p.value);
              document
                .getElementById(`dropdown-${service}`)
                ?.classList.add("hidden");
            }}
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

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-slate-400">
              Time Series
            </CardTitle>
            <div className="text-2xl font-bold text-white">{service}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] w-full flex flex-col justify-end p-4">
            {/* Skeleton chart bars */}
            <div className="flex items-end justify-around h-full gap-2">
              <div
                className="w-8 bg-white/5 rounded-t animate-pulse"
                style={{ height: "40%" }}
              />
              <div
                className="w-8 bg-white/5 rounded-t animate-pulse"
                style={{ height: "65%" }}
              />
              <div
                className="w-8 bg-white/5 rounded-t animate-pulse"
                style={{ height: "30%" }}
              />
              <div
                className="w-8 bg-white/5 rounded-t animate-pulse"
                style={{ height: "80%" }}
              />
              <div
                className="w-8 bg-white/5 rounded-t animate-pulse"
                style={{ height: "50%" }}
              />
              <div
                className="w-8 bg-white/5 rounded-t animate-pulse"
                style={{ height: "70%" }}
              />
              <div
                className="w-8 bg-white/5 rounded-t animate-pulse"
                style={{ height: "45%" }}
              />
            </div>
            {/* Skeleton axis */}
            <div className="h-px w-full bg-white/10 mt-2" />
          </div>
        ) : data.length === 0 || clientNames.length === 0 ? (
          <div className="h-[200px] w-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-neutral-500 text-sm">
                No data for this period
              </div>
              <div className="text-neutral-600 text-xs mt-1">
                Try selecting a different time range
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[200px] w-full">
            <MemoryChart
              data={data}
              isMultiSeries={isMultiSeries}
              clientNames={clientNames}
              clientConfigs={clientConfigs}
              hovered={hovered}
              setHovered={setHovered}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
