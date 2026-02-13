import { existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

/**
 * Resolves the CyberMem data directory depending on the runtime environment:
 *
 * 1. Explicit `DATA_DIR` env var (highest priority)
 * 2. Docker volume mount at `/data` (container runtime)
 * 3. `~/.cybermem/data` (local dev / Next.js standalone)
 */
export function resolveDataDir(): string {
  const envDataDir = process.env.DATA_DIR?.trim();
  if (envDataDir) return envDataDir;
  if (existsSync("/data")) return "/data";
  return resolve(homedir(), ".cybermem/data");
}
