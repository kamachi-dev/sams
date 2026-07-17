export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { queueCameraCommand } from '@/app/services/camera-settings'

export async function POST(request: Request) {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const command = await queueCameraCommand('snapshot', user.id)
        return NextResponse.json({ success: true, data: { commandId: command.id, status: command.status } })
    } catch (error) {
        console.error('Error triggering camera snapshot:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to trigger camera snapshot' }, { status: 500 })
    }
}
