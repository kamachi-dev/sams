export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(req: Request) {
    try {
        const user = await currentUser()
        
        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'Not authenticated' 
            }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get('course')

        if (!courseId) {
            return NextResponse.json({
                success: false,
                error: 'Course parameter is required'
            }, { status: 400 })
        }

        // Verify teacher owns this course
        const courseCheck = await db.query(
            `SELECT id, name FROM course WHERE id = $1 AND teacher = $2 AND school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [courseId, user.id]
        )

        if (courseCheck.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Course not found or not assigned to you'
            }, { status: 404 })
        }

        // Get distinct sections for this course with student counts
        const result = await db.query(`
            SELECT 
                COALESCE(sd.section, 'Unassigned') as section,
                COUNT(DISTINCT e.student) as student_count
            FROM enrollment_data e
            INNER JOIN account a ON e.student = a.id
            LEFT JOIN student_data sd ON sd.student = a.id
            WHERE e.course = $1
            GROUP BY sd.section
            ORDER BY sd.section
        `, [courseId])

        // Get student names per section
        const studentsResult = await db.query(`
            SELECT 
                COALESCE(sd.section, 'Unassigned') as section,
                a.username as name
            FROM enrollment_data e
            INNER JOIN account a ON e.student = a.id
            LEFT JOIN student_data sd ON sd.student = a.id
            WHERE e.course = $1
            ORDER BY sd.section, a.username
        `, [courseId])

        // Group students by section
        const studentsBySection: Record<string, string[]> = {}
        for (const row of studentsResult.rows) {
            if (!studentsBySection[row.section]) {
                studentsBySection[row.section] = []
            }
            studentsBySection[row.section].push(row.name)
        }

        return NextResponse.json({ 
            success: true, 
            data: {
                course: courseCheck.rows[0],
                sections: result.rows.map(row => ({
                    section: row.section,
                    studentCount: parseInt(row.student_count),
                    students: (studentsBySection[row.section] || []).sort((a: string, b: string) => a.localeCompare(b))
                }))
            }
        })
    } catch (error) {
        console.error('Error fetching course sections:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch sections'
        }, { status: 500 })
    }
}
