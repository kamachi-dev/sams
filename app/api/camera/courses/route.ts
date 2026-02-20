export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'

// GET /api/camera/courses - List all courses
// GET /api/camera/courses?courseId=...&section=... - List students in a course and section

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get('courseId')
        const section = searchParams.get('section')

        if (courseId) {
            // Get course info
            const courseResult = await db.query(
                `SELECT id, name, schedule, teacher FROM course WHERE id = $1 AND school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
                [courseId]
            )
            if (courseResult.rows.length === 0) {
                return NextResponse.json({ success: false, status: 404, data: null, error: 'Course not found' }, { status: 404 })
            }
            const course = courseResult.rows[0]

            // Get enrolled students
            const studentsQuery = `
                SELECT a.id, a.username as name, a.email, sd.section
                FROM enrollment_data e
                INNER JOIN account a ON e.student = a.id
                LEFT JOIN student_data sd ON sd.student = a.id
                WHERE e.course = $1
                ${section ? 'AND sd.section = $2' : ''}
                ORDER BY a.username ASC
            `
            const studentsResult = await db.query(studentsQuery, section ? [courseId, section] : [courseId])
            course.enrolled_students = studentsResult.rows.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                section: row.section
            }))

            return NextResponse.json({
                success: true,
                data: course
            })
        } else {
            // Get all courses
            const result = await db.query(`
                SELECT id, name, schedule, teacher
                FROM course
                WHERE school_year = (SELECT active_school_year FROM meta WHERE id='1')
                ORDER BY name
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
