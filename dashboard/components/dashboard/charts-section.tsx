"use client"

import { useEffect, useState } from "react";
import ChartCard from "./chart-card";

export default function ChartsSection({ period }: { period: string }) {
  const [charts, setCharts] = useState<{ title: string; service: string; data: any[]; clientNames?: string[] }[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/metrics?period=${period}`)
        if (res.ok) {
          const data = await res.json()

          if (data.timeSeries) {
            // Helper to format time
            const formatSeries = (series: any[]) => {
              if (!series) return []
              return series.map(point => ({
                ...point,
                time: new Date((point.time as number) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }))
            }

            // Extract client names from the first data point of requests, or aggregate from all keys
            const getClients = (series: any[]) => {
                if (!series || series.length === 0) return []
                // Collect all unique keys from all points, excluding 'time'
                const keys = new Set<string>()
                series.forEach(point => {
                    Object.keys(point).forEach(k => {
                        if (k !== 'time') keys.add(k)
                    })
                })
                return Array.from(keys)
            }

            const allClients = Array.from(new Set([
                ...getClients(data.timeSeries.creates),
                ...getClients(data.timeSeries.reads),
                ...getClients(data.timeSeries.updates),
                ...getClients(data.timeSeries.deletes)
            ]))


            setCharts([
              { title: "", service: "Creates by Client", data: formatSeries(data.timeSeries.creates), clientNames: allClients },
              { title: "", service: "Reads by Client", data: formatSeries(data.timeSeries.reads), clientNames: allClients },
              { title: "", service: "Updates by Client", data: formatSeries(data.timeSeries.updates), clientNames: allClients },
              { title: "", service: "Deletes by Client", data: formatSeries(data.timeSeries.deletes), clientNames: allClients }
            ])
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchData()
  }, [])

  if (charts.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-800/20 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {charts.map((chart, i) => (
        <ChartCard key={i} {...chart} />
      ))}
    </div>
  )
}
