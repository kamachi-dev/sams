export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { claimNextCameraCommand, completeCameraCommand } from '@/app/services/camera-settings'

function isAuthorized(request: Request) {
    const expectedToken = process.env.CAMERA_AGENT_TOKEN
    return Boolean(expectedToken && request.headers.get('x-camera-agent-token') === expectedToken)
}

function unauthorized() {
    return NextResponse.json({ success: false, error: 'Unauthorized camera agent.' }, { status: 401 })
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) return unauthorized()
    try {
        const { searchParams } = new URL(request.url)
        const teacherId = searchParams.get('teacher_id') || undefined
        const actions = searchParams.getAll('action')
        return NextResponse.json({ success: true, data: await claimNextCameraCommand(teacherId, actions.length ? actions : undefined) })
    } catch (error) {
        console.error('Error claiming camera command:', error)
        return NextResponse.json({ success: false, error: 'Failed to load camera command.' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    if (!isAuthorized(request)) return unauthorized()
    try {
        const body = await request.json()
        const id = Number(body.id)
        const succeeded = body.succeeded === true
        const error = typeof body.error === 'string' ? body.error : ''
        if (!Number.isSafeInteger(id) || id < 1) {
            return NextResponse.json({ success: false, error: 'Invalid camera command.' }, { status: 400 })
        }
        await completeCameraCommand(id, succeeded, error)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error completing camera command:', error)
        return NextResponse.json({ success: false, error: 'Failed to complete camera command.' }, { status: 500 })
    }
}
