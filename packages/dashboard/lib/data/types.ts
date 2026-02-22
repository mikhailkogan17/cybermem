export interface TrendState {
  change: string;
  trend: "up" | "down" | "neutral";
  hasData: boolean;
  data: number[];
}

export interface DashboardStats {
  memoryRecords: number;
  totalClients: number;
  successRate: number;
  totalRequests: number;
  topWriter: { name: string; count: number };
  topReader: { name: string; count: number };
  lastWriter: { name: string; timestamp: number };
  lastReader: { name: string; timestamp: number };
  topWriterId?: string;
  topReaderId?: string;
  lastWriterId?: string;
  lastReaderId?: string;
}

export interface AuditLogEntry {
  id: number;
  date: string;
  client: string;
  operation: string;
  tool?: string;
  status: string;
  description: string;
  timestamp: number;
  method?: string;
  rawStatus?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  logs: AuditLogEntry[];
}

export interface TimeSeriesData {
  creates: any[];
  reads: any[];
  updates: any[];
  deletes: any[];
  metadata?: Record<string, any>;
}
