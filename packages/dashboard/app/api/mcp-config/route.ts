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
      "http://localhost:8626/mcp";
    const isManaged = settings.isManaged || false;
    const env = settings.env || "prod";
    const isStaging = env === "staging";

    const displayKey = maskKey
      ? "••••••••••••••••"
      : apiKey || "sk-your-generated-token";
    const actualKey = apiKey || "sk-your-generated-token";

    const client = clientsConfig.find((c: any) => c.id === clientId);

    // Generate config based on client type
    let config: any;
    let configType = client?.configType || "json";

    if (configType === "toml") {
      if (isManaged) {
        config = `[mcpServers.cybermem]\ncommand = "npx"\nargs = ["@cybermem/mcp"]`;
      } else {
        const keyVal = maskKey ? displayKey : actualKey;
        config = `[mcpServers.cybermem]\ncommand = "npx"\nargs = ["@cybermem/mcp", "--url", "${baseUrl}", "--token", "${keyVal}"]`;
      }
    } else if (configType === "command" || configType === "cmd") {
      let cmd = isManaged ? client?.localCommand : client?.remoteCommand;
      if (!cmd) {
        cmd = client?.command?.replace("http://localhost:8080", baseUrl) || "";
      }
      cmd = cmd.replace("{{ENDPOINT}}", baseUrl);
      cmd = cmd.replace("{{API_KEY}}", maskKey ? displayKey : actualKey);
      cmd = cmd.replace("{{TOKEN}}", maskKey ? displayKey : actualKey);
      config = cmd;
    } else {
      // JSON (default)
      const args = isManaged
        ? ["-y", "@cybermem/mcp"]
        : [
            "-y",
            "@cybermem/mcp",
            "--url",
            baseUrl,
            "--token",
            maskKey ? displayKey : actualKey,
          ];

      if (isStaging && !isManaged) {
        args.push("--staging");
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
