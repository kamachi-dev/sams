export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const SNAPSHOTS_DIR = path.join(process.cwd(), 'public', 'snapshots')

function isAuthorized(request: Request) {
    const expectedToken = process.env.CAMERA_AGENT_TOKEN
    const providedToken = request.headers.get('x-camera-agent-token')
    return Boolean(expectedToken && providedToken && providedToken === expectedToken)
}

export async function POST(request: Request) {
    if (!process.env.CAMERA_AGENT_TOKEN) {
        return NextResponse.json({ success: false, error: 'Camera agent is not configured.' }, { status: 503 })
    }
    if (!isAuthorized(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized camera agent.' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { section_id, timestamp, image_base64 } = body

        if (!section_id || !timestamp || !image_base64) {
            return NextResponse.json({ success: false, error: 'Missing required fields: section_id, timestamp, image_base64' }, { status: 400 })
        }

        const sectionDir = path.join(SNAPSHOTS_DIR, String(section_id))
        if (!existsSync(sectionDir)) {
            await mkdir(sectionDir, { recursive: true })
        }

        const filename = `snapshot_${timestamp}.jpg`
        const filepath = path.join(sectionDir, filename)
        const buffer = Buffer.from(image_base64, 'base64')
        await writeFile(filepath, buffer)

        return NextResponse.json({
            success: true,
            data: { url: `/snapshots/${section_id}/${filename}`, filename },
        })
    } catch (error) {
        console.error('Error saving snapshot image:', error)
        return NextResponse.json({ success: false, error: 'Failed to save snapshot image' }, { status: 500 })
    }
}
