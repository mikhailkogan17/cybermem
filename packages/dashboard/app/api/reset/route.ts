import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

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

    // Wipe database via docker exec
    const containerName = process.env.OPENMEMORY_CONTAINER || 'cybermem-openmemory'

    try {
      // Remove SQLite files
      await execAsync(
        `docker exec ${containerName} sh -c 'rm -f /data/openmemory.sqlite*'`
      )

      // Restart container to reinitialize
      await execAsync(`docker restart ${containerName}`)

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

      if (!healthy) {
        return NextResponse.json(
          { error: 'Database reset but container failed to become healthy' },
          { status: 500 }
        )
      }

      // Restart log-exporter and db-exporter
      await execAsync('docker restart cybermem-log-exporter cybermem-db-exporter').catch(() => {})

      return NextResponse.json({
        success: true,
        message: 'Database reset successfully'
      })

    } catch (dockerError: any) {
      return NextResponse.json(
        { error: `Docker command failed: ${dockerError.message}` },
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
