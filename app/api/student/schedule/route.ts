export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'

// GET /api/student/schedule?studentId=... - Get all courses and their schedules for a student
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const studentId = searchParams.get('studentId')

        if (!studentId) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'Student id required' }, { status: 400 })
        }

        // Get all courses the student is enrolled in with their schedules
        const result = await db.query(`
            SELECT c.id, c.name, c.schedule
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            WHERE e.student = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
            ORDER BY c.name
        `, [studentId])

        return NextResponse.json({
            success: true,
            status: 200,
            data: result.rows,
            error: null
        })
    } catch (error) {
        console.error('Error fetching student schedule:', error)
        return NextResponse.json({
            success: false,
            status: 500,
            data: { message: String(error) },
            error: 'Failed to fetch student schedule'
        }, { status: 500 })
    }
}
