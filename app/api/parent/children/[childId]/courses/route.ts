export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET: Fetch course-by-course attendance breakdown for a specific child
 * Verifies that the parent owns this child
 * Returns: Array of courses with attendance counts and percentage
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ childId: string }> }
) {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Not authenticated'
            }, { status: 401 })
        }

        const { childId } = await params

        // Verify parent owns this child
        const childCheck = await db.query(`
            SELECT a.id FROM account a
            INNER JOIN student_data sd ON sd.student = a.id
            WHERE a.id = $1 AND sd.parent = $2
        `, [childId, user.id])

        if (childCheck.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Child not found or not owned by parent'
            }, { status: 404 })
        }

        const result = await db.query(`
            SELECT
                c.name as course_name,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance IN (0, NULL) THEN 1 END) as absent_count,
                COUNT(*) as total_records
            FROM record r
            INNER JOIN section s ON r.course = s.id
            INNER JOIN course c ON s.course = c.id
            WHERE r.student = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
              AND r.time IS NOT NULL
            GROUP BY c.name
            ORDER BY c.name
        `, [childId])

        const courses = result.rows.map(row => {
            const presentCount = parseInt(row.present_count) || 0
            const lateCount = parseInt(row.late_count) || 0
            const absentCount = parseInt(row.absent_count) || 0
            const totalRecords = parseInt(row.total_records) || 0

            const percentage = totalRecords > 0
                ? ((presentCount + lateCount) / totalRecords * 100)
                : 0

            return {
                course: row.course_name,
                present: presentCount,
                late: lateCount,
                absent: absentCount,
                percentage: parseFloat(percentage.toFixed(1))
            }
        })

        return NextResponse.json({
            success: true,
            data: courses
        })
    } catch (error) {
        console.error('Error fetching child course attendance:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch course data'
        }, { status: 500 })
    }
}
