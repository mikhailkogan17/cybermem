import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

// Helper to read config
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { apiKey: "cm_sk_live_592834...8239" };
    }
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading config:", error);
    return { apiKey: "cm_sk_live_592834...8239" };
  }
}

// Helper to write config
function writeConfig(config: any) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing config:", error);
    return false;
  }
}

export async function GET() {
  const config = readConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentConfig = readConfig();
    const newConfig = { ...currentConfig, ...body };

    if (writeConfig(newConfig)) {
      return NextResponse.json(newConfig);
    } else {
      return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
