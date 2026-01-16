import { exec } from 'child_process'
import { unlinkSync, writeFileSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

/**
 * POST /api/restore
 * Restores the OpenMemory database from uploaded backup
 *
 * Accepts multipart/form-data with 'backup' file field
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('backup') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No backup file provided. Upload as "backup" field.' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tgz')) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be .tar.gz or .tgz' },
        { status: 400 }
      )
    }

    const containerName = process.env.OPENMEMORY_CONTAINER || 'cybermem-openmemory'
    const tmpPath = join(tmpdir(), `restore-${Date.now()}.tar.gz`)

    try {
      // Write uploaded file to temp location
      const buffer = Buffer.from(await file.arrayBuffer())
      writeFileSync(tmpPath, buffer)

      // Stop container
      await execAsync(`docker stop ${containerName}`)

      // Extract backup to container volume
      await execAsync(
        `gunzip -c "${tmpPath}" | docker cp - ${containerName}:/`
      )

      // Clean up temp file
      unlinkSync(tmpPath)

      // Start container
      await execAsync(`docker start ${containerName}`)

      // Wait for health
      let healthy = false
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000))
        try {
          const healthUrl = process.env.CYBERMEM_URL || 'http://localhost:8626'
          const res = await fetch(`${healthUrl}/health`, { cache: 'no-store' })
          if (res.ok) {
            healthy = true
            break
          }
        } catch {
          // Still starting up
        }
      }

      // Restart exporters
      await execAsync('docker restart cybermem-log-exporter cybermem-db-exporter').catch(() => {})

      return NextResponse.json({
        success: true,
        message: 'Database restored successfully',
        healthy
      })

    } catch (dockerError: any) {
      // Clean up temp file on error
      try { unlinkSync(tmpPath) } catch {}

      return NextResponse.json(
        { error: `Restore failed: ${dockerError.message}` },
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
