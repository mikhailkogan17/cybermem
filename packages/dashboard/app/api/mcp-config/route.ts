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
    const settingsRes = await fetch(
      `${request.headers.get("origin") || "http://localhost:8626"}/api/settings`,
      {
        headers: request.headers,
      },
    );
    const settings = settingsRes.ok ? await settingsRes.json() : {};

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
