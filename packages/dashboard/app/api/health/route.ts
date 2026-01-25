import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

interface ServiceStatus {
  name: string;
  status: "ok" | "error" | "warning";
  message?: string;
  latencyMs?: number;
}

interface SystemHealth {
  overall: "ok" | "degraded" | "error";
  services: ServiceStatus[];
  timestamp: string;
}

async function checkService(
  name: string,
  url: string,
  timeout = 3000,
): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "X-Client-Name": "antigravity-client",
      },
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - start;

    if (res.ok) {
      try {
        const data = await res.json();
        if (data.ok === false || data.status === "error") {
          return {
            name,
            status: "error",
            message: data.error || data.message || "Service reported error",
            latencyMs,
          };
        }
        return { name, status: "ok", latencyMs };
      } catch {
        // If not JSON but OK, assume OK (legacy services)
        return { name, status: "ok", latencyMs };
      }
    }
    return {
      name,
      status: "warning",
      message: `HTTP ${res.status}`,
      latencyMs,
    };
  } catch (error: any) {
    return {
      name,
      status: "error",
      message:
        error.name === "AbortError"
          ? "Timeout"
          : error.message || "Connection failed",
    };
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  // Check SQLite Database File
  const homedir = process.env.HOME || process.env.USERPROFILE || "";
  const dbPath =
    process.env.OM_DB_PATH ||
    path.resolve(homedir, ".cybermem/data/openmemory.sqlite");

  const dbExists = fs.existsSync(dbPath);
  console.error(
    `[HEALTH-API] SQLite Check: ${dbExists ? "OK" : "MISSING"} (${dbPath})`,
  );

  const dbStatus: ServiceStatus = dbExists
    ? { name: "Database", status: "ok" }
    : { name: "Database", status: "error", message: "SQLite file not found" };

  const checks: ServiceStatus[] = [dbStatus];

  // Check Core API if explicitly configured
  const apiEndpoint =
    process.env.INTERNAL_MCP_URL ||
    process.env.CYBERMEM_URL ||
    process.env.OPENMEMORY_URL ||
    "http://localhost:8626";

  if (apiEndpoint) {
    console.error(`[HEALTH-API] Checking API at ${apiEndpoint}/health`);
    const apiStatus = await checkService(
      "CyberMem (MCP) API",
      `${apiEndpoint}/health`,
    );
    console.error(`[HEALTH-API] API Status: ${apiStatus.status}`);
    checks.push(apiStatus);
  }

  const services = checks;

  // Determine overall status
  const hasError = services.some((s) => s.status === "error");
  const hasWarning = services.some((s) => s.status === "warning");

  const health: SystemHealth = {
    overall: hasError ? "error" : hasWarning ? "degraded" : "ok",
    services,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(health, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-RateLimit-Remaining": String(rateLimit.remaining),
    },
  });
}
