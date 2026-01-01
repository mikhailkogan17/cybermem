import Docker from 'dockerode';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const container = docker.getContainer('cybermem-openmemory');

    await container.restart();

    return NextResponse.json({ success: true, message: 'Container restarting...' })
  } catch (error) {
    console.error('[Dashboard] Failed to restart server:', error)
    return NextResponse.json({ error: 'Failed to restart server' }, { status: 500 })
  }
}
