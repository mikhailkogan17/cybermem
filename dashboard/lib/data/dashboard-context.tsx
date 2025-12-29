
"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { DemoDataSource } from "./demo-strategy"
import { ProductionDataSource } from "./production-strategy"
import { DataSourceStrategy } from "./types"

interface ClientConfig {
  id: string
  name: string
  match: string
  color: string
  icon: string | null
  description: string
  steps: string[]
  configType: string
}

interface DashboardContextType {
  strategy: DataSourceStrategy
  isDemo: boolean
  toggleDemo: () => void
  refreshSignal: number
  clientConfigs: ClientConfig[]
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState(false)
  const [strategy, setStrategy] = useState<DataSourceStrategy>(new ProductionDataSource())
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [clientConfigs, setClientConfigs] = useState<ClientConfig[]>([])

  // Initialize from local storage and load config
  useEffect(() => {
    const savedDemo = localStorage.getItem("demoMode") === "true"
    setIsDemo(savedDemo)
    setStrategy(savedDemo ? new DemoDataSource() : new ProductionDataSource())

    // Load client config
    fetch("/clients.json")
        .then(res => res.json())
        .then(data => setClientConfigs(data))
        .catch(err => console.error("Failed to load client configs:", err))
  }, [])

  const toggleDemo = () => {
    const newState = !isDemo
    setIsDemo(newState)
    localStorage.setItem("demoMode", String(newState))
    setStrategy(newState ? new DemoDataSource() : new ProductionDataSource())
    setRefreshSignal(prev => prev + 1)
  }

  // Refresh data periodically (centralized trigger)
  useEffect(() => {
      if (isDemo) return // No auto-refresh in Demo Mode (static data)

      const interval = setInterval(() => {
         setRefreshSignal(prev => prev + 1)
      }, 5000)
      return () => clearInterval(interval)
  }, [isDemo])

  return (
    <DashboardContext.Provider value={{ strategy, isDemo, toggleDemo, refreshSignal, clientConfigs }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}
