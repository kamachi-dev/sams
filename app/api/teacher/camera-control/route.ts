export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { queueCameraCommand, readLatestCameraCommand } from '@/app/services/camera-settings'

export async function GET() {
    const user = await currentUser()
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    const command = await readLatestCameraCommand()
    // A command is the desired local camera state.  Treat a queued/claimed start
    // as running so a status refresh cannot change the button back to Start while
    // the on-premises agent is launching it.  A failed stop leaves the camera
    // marked running, allowing the teacher to retry Stop.
    const running = command?.action === 'start' || (command?.action === 'stop' && command.status === 'failed')
    return NextResponse.json({ success: true, data: { running, pending: command?.status === 'pending' || command?.status === 'claimed' } })
}

export async function POST(request: Request) {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const { action } = await request.json()
        if (action === 'start') {
            await queueCameraCommand('start', user.id)
            return NextResponse.json({ success: true, data: { running: true, pending: true } })
        }
        if (action === 'stop') {
            await queueCameraCommand('stop', user.id)
            return NextResponse.json({ success: true, data: { running: false, pending: true } })
        }
        return NextResponse.json({ success: false, error: 'Action must be start or stop.' }, { status: 400 })
    } catch (error) {
        console.error('Error controlling camera:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to control camera' }, { status: 500 })
    }
}
