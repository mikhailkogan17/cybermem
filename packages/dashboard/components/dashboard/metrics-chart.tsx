"use client"

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Fallback color generator
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

interface MetricsChartProps {
    data: any[]
    isMultiSeries: boolean
    clientNames: string[]
    clientConfigs: any[]
    hovered: string | null
    setHovered: (id: string | null) => void
}

export default function MetricsChart({
    data,
    isMultiSeries,
    clientNames,
    clientConfigs,
    hovered,
    setHovered
}: MetricsChartProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                backgroundColor: "rgba(11, 17, 22, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                color: "#fff",
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
                }}
                itemStyle={{ color: "#fff", fontSize: "12px", padding: "2px 0" }}
                labelStyle={{ color: "#9ca3af", marginBottom: "8px", fontSize: "12px", fontWeight: 500 }}
                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
            />
            {isMultiSeries && (
                <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                onMouseEnter={(e: any) => {
                    if (e.dataKey) setHovered(e.dataKey.toString())
                }}
                onMouseLeave={() => setHovered(null)}
                formatter={(value: any, entry: any) => {
                    // value is usually the name set on the Area, which we set below.
                    // But if that fails, we fallback to finding config.
                    return <span className="text-white">{value}</span>
                }}
                />
            )}
            {isMultiSeries ? (
                clientNames.map((client, i) => {
                    // Find matching config using regex
                    const keyLower = client.toLowerCase()
                    const config = clientConfigs.find((c: any) => new RegExp(c.match, 'i').test(keyLower))

                    // Use config if found, otherwise fallback
                    const name = config?.name || client
                    const color = config?.color || stringToColor(client)

                    const isHovered = hovered === client
                    const isAnyHovered = hovered !== null

                    return (
                    <Area
                        key={client}
                        type="monotone"
                        dataKey={client}
                        name={name}
                        stroke={color}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        fillOpacity={isHovered ? 0.5 : (isAnyHovered ? 0.1 : 0.2)}
                        fill={color}
                        stackId="1"
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        dot={false}
                        onMouseEnter={() => setHovered(client)}
                        onMouseLeave={() => setHovered(null)}
                    />
                    )
                })
            ) : (
                <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={1.5}
                fillOpacity={0.2}
                fill="#10b981"
                activeDot={{ r: 3, strokeWidth: 0 }}
                dot={false}
                // No hover effect needed for single series as there's nothing to distinguish from
                />
            )}
            </AreaChart>
        </ResponsiveContainer>
    )
}
