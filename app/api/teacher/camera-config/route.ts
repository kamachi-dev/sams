export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import db from '@/app/services/database'
import { readCameraConfig, writeCameraConfig } from '@/app/services/camera-config'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

type CameraContext = { room: string, courseName: string, section: string }

async function getTeacherContexts(teacherId: string): Promise<CameraContext[]> {
    const result = await db.query(
        `SELECT DISTINCT s.classroom, c.name AS course_name, s.name AS section_name
         FROM section s
         INNER JOIN course c ON c.id = s.course
         WHERE s.teacher = $1
           AND c.school_year = (SELECT active_school_year FROM meta WHERE id = '1')
           AND NULLIF(TRIM(s.classroom), '') IS NOT NULL
         ORDER BY s.classroom, c.name, s.name`,
        [teacherId],
    )
    return result.rows.map(row => ({
        room: String(row.classroom).trim(),
        courseName: String(row.course_name).trim(),
        section: String(row.section_name).trim(),
    })).filter(context => context.room && context.courseName && context.section)
}

export async function GET() {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const [config, contexts] = await Promise.all([readCameraConfig(), getTeacherContexts(user.id)])
        const roomOptions = [...new Set(contexts.map(context => context.room))]
        const defaultRoom = roomOptions[0] ?? ''
        return NextResponse.json({
            success: true,
            data: {
                room: config.room || defaultRoom,
                configuredRoom: config.room,
                defaultRoom,
                roomOptions,
                contexts,
                courseName: config.courseName,
                section: config.section,
                startTime: config.startTime,
                endTime: config.endTime,
                hasScheduleOverride: Boolean(config.startTime && config.endTime),
            },
        })
    } catch (error) {
        console.error('Error reading camera configuration:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to read camera configuration' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const body = await request.json()
        const room = typeof body.room === 'string' ? body.room.trim() : ''
        const courseName = typeof body.courseName === 'string' ? body.courseName.trim() : ''
        const section = typeof body.section === 'string' ? body.section.trim() : ''
        const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : ''
        const endTime = typeof body.endTime === 'string' ? body.endTime.trim() : ''
        const useScheduleOverride = body.useScheduleOverride === true
        const contexts = await getTeacherContexts(user.id)
        const roomOptions = [...new Set(contexts.map(context => context.room))]

        if (!room || !roomOptions.includes(room)) {
            return NextResponse.json({ success: false, error: 'Choose one of your assigned rooms.' }, { status: 400 })
        }
        if (!courseName && section) {
            return NextResponse.json({ success: false, error: 'Choose a course before choosing a section.' }, { status: 400 })
        }
        if (courseName && !contexts.some(context =>
            context.room === room && context.courseName === courseName && (!section || context.section === section)
        )) {
            return NextResponse.json({ success: false, error: 'Choose a course and section assigned to you in the selected room.' }, { status: 400 })
        }
        if (useScheduleOverride && (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime))) {
            return NextResponse.json({ success: false, error: 'Start and end times must both use HH:MM.' }, { status: 400 })
        }

        const config = {
            room,
            courseName,
            section,
            startTime: useScheduleOverride ? startTime : '',
            endTime: useScheduleOverride ? endTime : '',
        }
        await writeCameraConfig(config)
        return NextResponse.json({ success: true, data: { ...config, hasScheduleOverride: useScheduleOverride } })
    } catch (error) {
        console.error('Error saving camera configuration:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to save camera configuration' }, { status: 500 })
    }
}
