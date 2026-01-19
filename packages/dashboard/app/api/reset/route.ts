import { readdirSync, statSync, unlinkSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.DATA_DIR || '/data'

/**
 * POST /api/reset
 * Wipes the OpenMemory database
 *
 * Requires confirmation token in body: { confirm: "RESET" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Require explicit confirmation
    if (body.confirm !== 'RESET') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: "RESET" }' },
        { status: 400 }
      )
    }

    // Remove SQLite files directly via volume mount
    try {
      const files = readdirSync(DATA_DIR)
      let deletedCount = 0

      for (const file of files) {
        if (file.startsWith('openmemory.sqlite')) {
          const filePath = join(DATA_DIR, file)
          try {
            const stat = statSync(filePath)
            if (stat.isFile()) {
              unlinkSync(filePath)
              deletedCount++
            }
          } catch {
            // File may already be deleted
          }
        }
      }

      // Notify user that container restart is needed
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} database files. Restart openmemory container to reinitialize.`,
        deletedCount,
        restartRequired: true,
        restartCommand: 'docker restart cybermem-mcp'
      })

    } catch (fsError: any) {
      return NextResponse.json(
        { error: `File operation failed: ${fsError.message}` },
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
