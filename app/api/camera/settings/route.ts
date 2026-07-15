export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { readCameraSettings } from '@/app/services/camera-settings'

function isAuthorized(request: Request) {
    const expectedToken = process.env.CAMERA_AGENT_TOKEN
    const providedToken = request.headers.get('x-camera-agent-token')
    return Boolean(expectedToken && providedToken && providedToken === expectedToken)
}

export async function GET(request: Request) {
    if (!process.env.CAMERA_AGENT_TOKEN) {
        return NextResponse.json({ success: false, error: 'Camera agent is not configured.' }, { status: 503 })
    }
    if (!isAuthorized(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized camera agent.' }, { status: 401 })
    }

    try {
        const settings = await readCameraSettings()
        return NextResponse.json({ success: true, data: settings })
    } catch (error) {
        console.error('Error reading camera settings for agent:', error)
        return NextResponse.json({ success: false, error: 'Failed to load camera settings.' }, { status: 500 })
    }
}
