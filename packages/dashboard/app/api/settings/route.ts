import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONFIG_PATH = "/data/config.json";

export async function GET(request: NextRequest) {
  // Rate limiting check
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  let apiKey = process.env.OM_API_KEY || "not-set";

  // Try to read from HttpOnly cookie first
  const cookieKey = request.cookies.get("cybermem_api_key")?.value;
  if (cookieKey) {
    apiKey = cookieKey;
  }

  // Fallback to config file
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const conf = JSON.parse(raw);
      if (conf.api_key && apiKey === "not-set") apiKey = conf.api_key;
    }
  } catch (e) {
    // ignore
  }

  // Endpoint resolution:
  // 1. Env var CYBERMEM_URL
  // 2. Default to localhost:8088/memory (Managed Mode)
  const rawEndpoint = process.env.CYBERMEM_URL;
  const endpoint = rawEndpoint || "http://localhost:8088/memory";
  // isManaged = Local Mode (No Auth). Only if NO URL and NO API KEY.
  // If API Key is present (RPi), we are in "Secure/Legacy" mode, not Local.
  // In local development, rawEndpoint might be unset, but we still want to not be "managed" if we want to test auth flows.
  const isManaged = !rawEndpoint && !process.env.OM_API_KEY;

  return NextResponse.json(
    {
      apiKey: apiKey,
      endpoint,
      isManaged,
      dashboardVersion: "v0.7.0",
      mcpVersion: "v0.7.0",
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    },
  );
}
