export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { readCameraSettings } from '@/app/services/camera-settings'
import { readdir, stat } from 'fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const SNAPSHOTS_DIR = path.join(process.cwd(), 'public', 'snapshots')

export async function GET() {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const config = await readCameraSettings(user.id)
        if (!config.courseName || !config.section) {
            return NextResponse.json({ success: true, data: [] })
        }

        // Get section ID
        const { default: db } = await import('@/app/services/database')
        const sectionResult = await db.query(
            `SELECT s.id
             FROM section s
             INNER JOIN course c ON s.course = c.id
             WHERE c.name = $1 AND s.name = $2
               AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [config.courseName, config.section]
        )

        if (sectionResult.rows.length === 0) {
            return NextResponse.json({ success: true, data: [] })
        }

        const sectionId = sectionResult.rows[0].id
        const sectionDir = path.join(SNAPSHOTS_DIR, String(sectionId))

        if (!existsSync(sectionDir)) {
            return NextResponse.json({ success: true, data: [] })
        }

        const files = await readdir(sectionDir)
        const jpgFiles = files.filter(f => f.endsWith('.jpg')).sort().reverse().slice(0, 12)

        const snapshots = await Promise.all(
            jpgFiles.map(async (filename) => {
                const filepath = path.join(sectionDir, filename)
                const stats = await stat(filepath)
                const ts = filename.replace('snapshot_', '').replace('.jpg', '')
                return {
                    url: `/snapshots/${sectionId}/${filename}`,
                    filename,
                    timestamp: ts,
                    capturedAt: stats.mtime.toISOString(),
                }
            })
        )

        return NextResponse.json({ success: true, data: snapshots })
    } catch (error) {
        console.error('Error fetching camera snapshots:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch camera snapshots' }, { status: 500 })
    }
}
