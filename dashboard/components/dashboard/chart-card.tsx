"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface ChartCardProps {
  service: string
}

const CLIENT_COLORS: Record<string, string> = {
  'openai': '#FFFFFF',           // white
  'claude': '#FF7A00',           // orange
  'cursor': '#2D2D2D',           // dark gray
  'vscode': '#007ACC',           // VS Code blue
  'claude-code': '#FF7A00',      // orange
  'claude-desktop': '#FF7A00',   // orange
  'claude desktop': '#FF7A00',   // orange (with space)
  'github-copilot': '#000000',   // black
  'windsurf': '#00D4FF',         // cyan
  'anonymous': '#666666',        // gray
}

const FALLBACK_PALETTE = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444"]

const periods = [
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
]

export default function ChartCard({ service }: ChartCardProps) {
  const [period, setPeriod] = useState("24h")
  const [data, setData] = useState<any[]>([])
  const [clientNames, setClientNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/metrics?period=${period}`)
        if (res.ok) {
          const apiData = await res.json()

          if (apiData.timeSeries) {
            // Helper to format time
            const formatSeries = (series: any[]) => {
              if (!series) return []
              return series.map(point => ({
                ...point,
                time: new Date((point.time as number) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }))
            }

            // Extract client names from series
            const getClients = (series: any[]) => {
                if (!series || series.length === 0) return []
                const keys = new Set<string>()
                series.forEach(point => {
                    Object.keys(point).forEach(k => {
                        if (k !== 'time') keys.add(k)
                    })
                })
                return Array.from(keys)
            }

            // Get data based on service type
            let seriesData: any[] = []
            let clients: string[] = []

            if (service.includes("Creates")) {
              seriesData = formatSeries(apiData.timeSeries.creates)
              clients = getClients(apiData.timeSeries.creates)
            } else if (service.includes("Reads")) {
              seriesData = formatSeries(apiData.timeSeries.reads)
              clients = getClients(apiData.timeSeries.reads)
            } else if (service.includes("Updates")) {
              seriesData = formatSeries(apiData.timeSeries.updates)
              clients = getClients(apiData.timeSeries.updates)
            } else if (service.includes("Deletes")) {
              seriesData = formatSeries(apiData.timeSeries.deletes)
              clients = getClients(apiData.timeSeries.deletes)
            }

            setData(seriesData)
            setClientNames(clients)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [period, service])

  const isMultiSeries = clientNames.length > 0

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md relative overflow-visible">
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-slate-400">Time Series</CardTitle>
            <div className="text-2xl font-bold text-white">{service}</div>
          </div>
        </div>

        {/* Period Selector - Badge Style - Absolute positioned in top-right */}
        <div className="absolute top-0 right-0 group">
          <button className="h-8 px-3 rounded-tl-none rounded-tr-lg rounded-bl-2xl rounded-br-none bg-white/5 border-b border-l border-white/10 hover:border-emerald-500/50 text-white text-xs font-medium flex items-center gap-2 transition-all hover:bg-white/10">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="absolute right-0 mt-2 w-40 bg-[#0B1116]/95 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 backdrop-blur-xl overflow-hidden">
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
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] w-full flex items-center justify-center">
            <div className="text-neutral-500 text-sm">Loading...</div>
          </div>
        ) : (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {isMultiSeries ? (
                    clientNames.map((client, i) => {
                      const color = CLIENT_COLORS[client.toLowerCase()] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]
                      return (
                        <linearGradient key={client} id={`gradient-${service}-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      )
                    })
                  ) : (
                    <linearGradient id={`gradient-${service}-default`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="#2D3135" opacity={0.3} vertical={false} horizontal={true} />
                <XAxis
                  dataKey="time"
                  stroke="#6B7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  stroke="#6B7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  tick={{ fill: '#6B7280' }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0B1116",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                {isMultiSeries ? (
                  clientNames.map((client, i) => {
                     const color = CLIENT_COLORS[client.toLowerCase()] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]
                     return (
                       <Area
                         key={client}
                         type="monotone"
                         dataKey={client}
                         stroke={color}
                         strokeWidth={1.5}
                         fillOpacity={1}
                         fill={`url(#gradient-${service}-${i})`}
                         stackId="1"
                         activeDot={{ r: 3, strokeWidth: 0 }}
                         dot={false}
                       />
                     )
                  })
                ) : (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill={`url(#gradient-${service}-default)`}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    dot={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
