import { resolveDataDir } from "@/lib/resolve-data-dir";
import { execSync } from "child_process";
import { createReadStream, rmSync, statSync } from "fs";
import { NextResponse } from "next/server";
import { tmpdir } from "os";
import { join } from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = resolveDataDir();

/**
 * GET /api/backup
 * Creates and downloads a backup of the OpenMemory database
 */
export async function GET() {
  try {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const backupName = `cybermem-backup-${timestamp}.tar.gz`;
    const tmpPath = join(tmpdir(), backupName);

    try {
      // Create backup via tar command (available in Node alpine image)
      execSync(`tar -czf "${tmpPath}" -C "${DATA_DIR}" .`, { stdio: "pipe" });

      // Get file stats
      const stats = statSync(tmpPath);

      // Stream the file
      const stream = createReadStream(tmpPath);

      // Convert Node stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => {
            controller.close();
            // Clean up temp file after streaming
            try {
              rmSync(tmpPath);
            } catch {}
          });
          stream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": "application/gzip",
          "Content-Disposition": `attachment; filename="${backupName}"`,
          "Content-Length": String(stats.size),
        },
      });
    } catch (tarError: any) {
      return NextResponse.json(
        { error: `Backup failed: ${tarError.message}` },
        { status: 500 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}
