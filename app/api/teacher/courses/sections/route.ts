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

        // Verify teacher owns this section and get parent course
        const courseCheck = await db.query(
            `SELECT s.id, s.course as parent_course_id, c.name FROM section s INNER JOIN course c ON s.course = c.id WHERE s.id = $1 AND s.teacher = $2 AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [courseId, user.id]
        )

        if (courseCheck.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Course not found or not assigned to you'
            }, { status: 404 })
        }

        const parentCourseId = courseCheck.rows[0].parent_course_id

        // Get all sibling sections of the same parent course (taught by this teacher) with student counts
        const result = await db.query(`
            SELECT 
                s.id as section_id,
                s.name as section,
                COUNT(DISTINCT e.student) as student_count
            FROM section s
            LEFT JOIN enrollment_data e ON e.section = s.id
            WHERE s.course = $1
              AND s.teacher = $2
            GROUP BY s.id, s.name
            ORDER BY s.name
        `, [parentCourseId, user.id])

        // Get student names per section
        const studentsResult = await db.query(`
            SELECT 
                s.name as section,
                a.username as name
            FROM enrollment_data e
            INNER JOIN section s ON e.section = s.id
            INNER JOIN account a ON e.student = a.id
            WHERE s.course = $1
              AND s.teacher = $2
            ORDER BY s.name, a.username
        `, [parentCourseId, user.id])

        // Group students by section name
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
                    sectionId: row.section_id,
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
