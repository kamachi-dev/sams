export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET: Fetch attendance summary for a specific child
 * Verifies that the parent owns this child
 * Returns: Attendance counts and percentage
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

        // Get attendance counts
        const result = await db.query(`
            SELECT
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance IN (0, NULL) THEN 1 END) as absent_count,
                COUNT(*) as total_records,
                MAX(r.time) as latest_record_time
            FROM record r
            INNER JOIN section s ON r.course = s.id
            INNER JOIN course c ON s.course = c.id
            WHERE r.student = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
              AND r.time IS NOT NULL
        `, [childId])

        if (result.rows.length === 0 || result.rows[0].total_records === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    present: 0,
                    late: 0,
                    absent: 0,
                    percentage: 0,
                    absentYesterday: false
                }
            })
        }

        const row = result.rows[0]
        const presentCount = parseInt(row.present_count) || 0
        const lateCount = parseInt(row.late_count) || 0
        const absentCount = parseInt(row.absent_count) || 0
        const totalRecords = parseInt(row.total_records) || 0

        const attendancePercentage = totalRecords > 0
            ? ((presentCount + lateCount) / totalRecords * 100).toFixed(1)
            : '0.0'

        // Check if yesterday's record was absent
        const yesterdayCheck = await db.query(`
            SELECT COUNT(*) as count FROM record r
            INNER JOIN section s ON r.course = s.id
            INNER JOIN course c ON s.course = c.id
            WHERE r.student = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
              AND DATE(r.time) = CURRENT_DATE - INTERVAL '1 day'
              AND r.attendance IN (0, NULL)
        `, [childId])

        const absentYesterday = (parseInt(yesterdayCheck.rows[0]?.count || 0) || 0) > 0

        return NextResponse.json({
            success: true,
            data: {
                present: presentCount,
                late: lateCount,
                absent: absentCount,
                percentage: parseFloat(attendancePercentage),
                absentYesterday
            }
        })
    } catch (error) {
        console.error('Error fetching child attendance summary:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch summary'
        }, { status: 500 })
    }
}
