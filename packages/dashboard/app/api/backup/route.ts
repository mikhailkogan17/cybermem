import { exec } from 'child_process'
import { createReadStream, statSync } from 'fs'
import { NextResponse } from 'next/server'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

/**
 * GET /api/backup
 * Creates and downloads a backup of the OpenMemory database
 */
export async function GET() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupName = `cybermem-backup-${timestamp}.tar.gz`
    const tmpPath = join(tmpdir(), backupName)

    // Create backup via docker
    const containerName = process.env.OPENMEMORY_CONTAINER || 'cybermem-openmemory'

    try {
      // Copy data from container to temp location
      await execAsync(
        `docker cp ${containerName}:/data - | gzip > "${tmpPath}"`
      )

      // Get file stats
      const stats = statSync(tmpPath)

      // Stream the file
      const stream = createReadStream(tmpPath)

      // Convert Node stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk))
          stream.on('end', () => controller.close())
          stream.on('error', (err) => controller.error(err))
        }
      })

      return new NextResponse(webStream, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${backupName}"`,
          'Content-Length': String(stats.size)
        }
      })

    } catch (dockerError: any) {
      return NextResponse.json(
        { error: `Backup failed: ${dockerError.message}` },
        { status: 500 }
      )
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
