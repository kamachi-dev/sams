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
            // Get all students enrolled in the specified course and section
            const result = await db.query(`
                SELECT a.id, a.username as name, a.email, sd.section
                FROM enrollment_data e
                INNER JOIN account a ON e.student = a.id
                LEFT JOIN student_data sd ON sd.student = a.id
                WHERE e.course = $1
                ${section ? 'AND sd.section = $2' : ''}
                ORDER BY a.username ASC
            `, section ? [courseId, section] : [courseId])

            const students = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                section: row.section
            }))

            return NextResponse.json({
                success: true,
                data: students
            })
        } else {
            // Get all courses
            const result = await db.query(`
                SELECT id, name, schedule, teacher
                FROM course
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
