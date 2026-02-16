import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

// Load clients config
let clientsConfig: any[] = [];
try {
  const configPath = path.join(process.cwd(), "public", "clients.json");
  clientsConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (e) {
  console.error("Failed to load clients.json:", e);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client") || "claude";
    const maskKey = searchParams.get("mask") === "true";

    // Fetch settings to get env, endpoint, apiKey, isManaged
    // We try to fetch from the origin first, but fallback to localhost:3000 if interior to Docker
    const origin =
      request.headers.get("origin") || request.headers.get("referer");
    const internalUrl = `http://localhost:3000/api/settings`;
    const externalUrl = `${origin}/api/settings`;

    let settings: any = {};
    try {
      // Priority: Try fetching from the same process/port (Localhost:3000)
      const settingsRes = await fetch(internalUrl, {
        headers: request.headers,
        signal: AbortSignal.timeout(2000),
      });
      if (settingsRes.ok) {
        settings = await settingsRes.json();
      } else if (origin) {
        // Fallback to origin if internal fetch failed
        const extRes = await fetch(externalUrl, { headers: request.headers });
        if (extRes.ok) settings = await extRes.json();
      }
    } catch (e) {
      console.warn(
        "[MCP-CONFIG-API] Internal fetch failed, using fallback empty settings",
        e,
      );
    }

    const apiKey = settings.apiKey !== "not-set" ? settings.apiKey : "";
    const baseUrl =
      searchParams.get("baseUrl") ||
      settings.endpoint ||
      "http://localhost:8626/sse";
    const isManaged = settings.isManaged || false;
    const env = settings.env || "prod";
    const isStaging = env === "staging";

    const displayKey = maskKey
      ? "••••••••••••••••"
      : apiKey || "sk-your-generated-token";
    const actualKey = apiKey || "sk-your-generated-token";

    const client = clientsConfig.find((c: any) => c.id === clientId);

    // Generate config based on client type
    let config: string | object;
    const configType = client?.configType || "json";

    const isHttp = baseUrl.startsWith("http://");
    const isLocalhost =
      baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
    // RPi LAN is trusted, no auth required
    const isRpiLan = baseUrl.includes("raspberrypi.local");

    // Local envs (isManaged): use @cybermem/mcp directly
    // Remote envs: use mcp-remote (standard stdio-to-HTTP bridge)
    if (configType === "toml") {
      if (isManaged) {
        const localArgs = isStaging
          ? `["-y", "@cybermem/mcp", "--env", "staging"]`
          : `["-y", "@cybermem/mcp"]`;
        config = `[mcpServers.cybermem]\ncommand = "npx"\nargs = ${localArgs}`;
      } else {
        const keyVal = maskKey ? displayKey : actualKey;
        let argsStr = `["-y", "mcp-remote", "${baseUrl}"`;
        if (isHttp && !isLocalhost) argsStr += `, "--allow-http"`;
        if (!isRpiLan && !isLocalhost && apiKey)
          argsStr += `, "--header", "X-API-Key:${keyVal}"`;
        argsStr += `]`;
        config = `[mcpServers.cybermem]\ncommand = "npx"\nargs = ${argsStr}`;
      }
    } else if (configType === "command" || configType === "cmd") {
      // Generate command directly (don't rely on clients.json templates)
      if (isManaged) {
        const clientName = client?.id || "cybermem";
        const cliPrefix = client?.id === "gemini-cli" ? "gemini" : "claude";
        config = `${cliPrefix} mcp add ${clientName} npx -y @cybermem/mcp`;
      } else {
        const keyVal = maskKey ? displayKey : actualKey;
        const clientName = client?.id || "cybermem";
        const cliPrefix = client?.id === "gemini-cli" ? "gemini" : "claude";
        let cmd = `${cliPrefix} mcp add ${clientName} -- npx -y mcp-remote ${baseUrl}`;
        if (isHttp && !isLocalhost) cmd += ` --allow-http`;
        if (!isRpiLan && !isLocalhost && apiKey)
          cmd += ` --header X-API-Key:${keyVal}`;
        config = cmd;
      }
    } else {
      // JSON (default)
      let args: string[];

      if (isManaged) {
        // Local: use @cybermem/mcp directly (SDK mode)
        args = ["-y", "@cybermem/mcp"];
        if (isStaging) {
          args.push("--env", "staging");
        }
      } else {
        // Remote: use mcp-remote (standard stdio-to-HTTP bridge)
        args = ["-y", "mcp-remote", baseUrl];
        if (isHttp && !isLocalhost) {
          args.push("--allow-http");
        }
        if (!isRpiLan && !isLocalhost && apiKey) {
          args.push(
            "--header",
            `X-API-Key:${maskKey ? displayKey : actualKey}`,
          );
        }
      }

      config = {
        mcpServers: {
          cybermem: {
            command: "npx",
            args: args,
          },
        },
      };
    }

    return NextResponse.json({
      config,
      configType,
      apiKey: maskKey ? displayKey : actualKey,
      baseUrl,
      isManaged,
      env,
    });
  } catch (error) {
    console.error("[MCP-CONFIG-API] Error generating config:", error);
    return NextResponse.json(
      { error: "Failed to generate config" },
      { status: 500 },
    );
  }
}
