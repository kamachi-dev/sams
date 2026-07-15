export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { isCameraRunning, startCamera, stopCamera } from '@/app/services/camera-runner'

export async function GET() {
    const user = await currentUser()
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    return NextResponse.json({ success: true, data: { running: isCameraRunning() } })
}

export async function POST(request: Request) {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const { action } = await request.json()
        if (action === 'start') {
            startCamera()
            return NextResponse.json({ success: true, data: { running: true } })
        }
        if (action === 'stop') {
            await stopCamera()
            return NextResponse.json({ success: true, data: { running: false } })
        }
        return NextResponse.json({ success: false, error: 'Action must be start or stop.' }, { status: 400 })
    } catch (error) {
        console.error('Error controlling camera:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to control camera' }, { status: 500 })
    }
}
