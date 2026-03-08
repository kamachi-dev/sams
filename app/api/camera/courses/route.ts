export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'

// GET /api/camera/courses - List all sections (classes)
// GET /api/camera/courses?courseId=... - List students in a section

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get('courseId')

        if (courseId) {
            // courseId is now a section id
            const courseResult = await db.query(
                `SELECT s.id, c.name, s.name as section_name, s.schedule, s.teacher FROM section s INNER JOIN course c ON s.course = c.id WHERE s.id = $1`,
                [courseId]
            )
            if (courseResult.rows.length === 0) {
                return NextResponse.json({ success: false, status: 404, data: null, error: 'Section not found' }, { status: 404 })
            }
            const course = courseResult.rows[0]

            // Get enrolled students for this section
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
                email: row.email
            }))

            return NextResponse.json({
                success: true,
                data: course
            })
        } else {
            // Get all sections with parent course info
            const result = await db.query(`
                SELECT s.id, c.name, s.name as section_name, s.schedule, s.teacher
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
