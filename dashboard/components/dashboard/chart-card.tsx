"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface ChartCardProps {
  title: string
  service: string
  data: any[]
  clientNames?: string[]
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

export default function ChartCard({ title, service, data, clientNames = [] }: ChartCardProps) {
  // If no client names provided, assume single series 'value'
  const isMultiSeries = clientNames.length > 0

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        <div className="text-2xl font-bold text-white">{service}</div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                {isMultiSeries ? (
                  clientNames.map((client, i) => {
                    const color = CLIENT_COLORS[client.toLowerCase()] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]
                    return (
                      <linearGradient key={client} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    )
                  })
                ) : (
                  <linearGradient id="gradient-default" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
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
                       strokeWidth={2}
                       fillOpacity={1}
                       fill={`url(#gradient-${i})`}
                       stackId="1"
                       activeDot={{ r: 4, strokeWidth: 0 }}
                     />
                   )
                })
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradient-default)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
