export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'

// GET /api/camera/courses - List all sections (classes)
// GET /api/camera/courses?courseId=... - List students in a section
// GET /api/camera/courses?classroom=...&day=... - Camera schedule feed for a classroom

function resolveDay(dayParam: string | null): string {
    if (dayParam && dayParam.trim()) {
        const normalized = dayParam.trim().toLowerCase()
        const dayMap: Record<string, string> = {
            mon: 'monday',
            tue: 'tuesday',
            tues: 'tuesday',
            wed: 'wednesday',
            thu: 'thursday',
            thur: 'thursday',
            thurs: 'thursday',
            fri: 'friday',
            sat: 'saturday',
            sun: 'sunday',
        }
        return dayMap[normalized] ?? normalized
    }
    return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get('courseId')
        const classroom = searchParams.get('classroom')
        const normalizedClassroom = classroom?.trim() ?? ''
        const day = resolveDay(searchParams.get('day'))

        if (courseId) {
            const courseResult = await db.query(
                `SELECT
                    s.id,
                    c.name,
                    s.name as section_name,
                    s.schedule,
                    s.teacher,
                    s.classroom,
                    (s.schedule::jsonb -> $2 ->> 'start') AS course_start_time,
                    (s.schedule::jsonb -> $2 ->> 'end') AS course_end_time
                FROM section s
                INNER JOIN course c ON s.course = c.id
                WHERE s.id = $1`,
                [courseId, day]
            )

            if (courseResult.rows.length === 0) {
                return NextResponse.json(
                    { success: false, status: 404, data: null, error: 'Section not found' },
                    { status: 404 }
                )
            }

            const course = courseResult.rows[0]
            course.course_start = course.course_start_time
            course.course_end = course.course_end_time

            const studentsQuery = `
                SELECT a.id, a.username as name, a.email
                FROM enrollment_data e
                INNER JOIN account a ON e.student = a.id
                WHERE e.section = $1
                ORDER BY a.username ASC
            `
            const studentsResult = await db.query(studentsQuery, [courseId])

            course.enrolled_students = studentsResult.rows.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                section: course.section_name
            }))

            return NextResponse.json({
                success: true,
                data: course
            })
        } else if (normalizedClassroom) {
            const result = await db.query(
                `SELECT
                    s.id,
                    c.name,
                    s.name as section_name,
                    s.schedule,
                    s.teacher,
                    s.classroom,
                    (s.schedule::jsonb -> $2 ->> 'start') AS course_start_time,
                    (s.schedule::jsonb -> $2 ->> 'end') AS course_end_time
                FROM section s
                INNER JOIN course c ON s.course = c.id
                WHERE s.classroom = $1
                  AND (s.schedule::jsonb -> $2) IS NOT NULL
                ORDER BY (s.schedule::jsonb -> $2 ->> 'start') ASC NULLS LAST, c.name ASC, s.name ASC`,
                [normalizedClassroom, day]
            )

            const data = result.rows.map((row) => ({
                ...row,
                course_start: row.course_start_time,
                course_end: row.course_end_time,
            }))

            const classroomStart = data
                .map((row) => row.course_start_time as string | null)
                .filter((value): value is string => Boolean(value))
                .sort()[0] ?? null

            const classroomEnd = data
                .map((row) => row.course_end_time as string | null)
                .filter((value): value is string => Boolean(value))
                .sort()
                .at(-1) ?? null

            return NextResponse.json({
                success: true,
                data,
                filters: {
                    classroom: normalizedClassroom,
                    day,
                },
                classroom_start: classroomStart,
                classroom_end: classroomEnd,
            })
        } else {
            const result = await db.query(`
                SELECT s.id, c.name, s.name as section_name, s.schedule, s.teacher, s.classroom
                FROM section s
                INNER JOIN course c ON s.course = c.id
                ORDER BY c.name, s.name
            `)

            return NextResponse.json({
                success: true,
                data: result.rows
            })
        }
    } catch (error) {
        console.error('Error in camera/courses GET:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch data'
        }, { status: 500 })
    }
}