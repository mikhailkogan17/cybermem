import { execSync } from 'child_process'
import { readdirSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { tmpdir } from 'os'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.DATA_DIR || '/data'

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

    const tmpPath = join(tmpdir(), `restore-${Date.now()}.tar.gz`)

    try {
      // Write uploaded file to temp location
      const buffer = Buffer.from(await file.arrayBuffer())
      writeFileSync(tmpPath, buffer)

      // Remove existing database files
      const existingFiles = readdirSync(DATA_DIR)
      for (const f of existingFiles) {
        if (f.startsWith('openmemory.sqlite')) {
          try { rmSync(join(DATA_DIR, f)) } catch {}
        }
      }

      // Extract backup to data directory
      execSync(`tar -xzf "${tmpPath}" -C "${DATA_DIR}"`, { stdio: 'pipe' })

      // Clean up temp file
      unlinkSync(tmpPath)

      return NextResponse.json({
        success: true,
        message: 'Database restored successfully. Restart openmemory container to apply.',
        restartRequired: true,
        restartCommand: 'docker restart cybermem-openmemory'
      })

    } catch (restoreError: any) {
      // Clean up temp file on error
      try { unlinkSync(tmpPath) } catch {}

      return NextResponse.json(
        { error: `Restore failed: ${restoreError.message}` },
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
