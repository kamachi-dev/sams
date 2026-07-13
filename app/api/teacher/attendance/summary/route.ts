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
        const courseFilter = searchParams.get('course')
        const sectionFilter = searchParams.get('section')

        // Get overall attendance summary for students in this teacher's courses
        // This is for the semester-wide "Average Attendance Rate"
        // We need to count all attendance including absences for students without records

        // Build queries based on filters
        let attendanceQuery: string
        let params: string[]

        if (courseFilter) {
            // Filter by course (section ID)
            // Deduplicate: keep best status per student per course per day (Present > Late > Absent)
            attendanceQuery = `SELECT 
                COUNT(CASE WHEN best.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN best.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN best.attendance = 0 THEN 1 END) as explicit_absent_count
            FROM (
                SELECT DISTINCT ON (r.student, r.course, DATE(r.time))
                    r.attendance
                FROM record r
                INNER JOIN section s ON r.course = s.id
                INNER JOIN course c ON s.course = c.id
                INNER JOIN enrollment_data e ON e.student = r.student AND e.section = s.id
                WHERE s.teacher = $1 AND s.id = $2
                  AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                  AND r.time IS NOT NULL
                ORDER BY r.student, r.course, DATE(r.time),
                    CASE r.attendance WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 0 THEN 3 ELSE 4 END ASC
            ) AS best`

            params = [user.id, courseFilter]
        } else {
            attendanceQuery = `SELECT 
                COUNT(CASE WHEN best.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN best.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN best.attendance = 0 THEN 1 END) as explicit_absent_count
            FROM (
                SELECT DISTINCT ON (r.student, r.course, DATE(r.time))
                    r.attendance
                FROM record r
                INNER JOIN section s ON r.course = s.id
                INNER JOIN course c ON s.course = c.id
                WHERE s.teacher = $1
                  AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                  AND r.time IS NOT NULL
                ORDER BY r.student, r.course, DATE(r.time),
                    CASE r.attendance WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 0 THEN 3 ELSE 4 END ASC
            ) AS best`

            params = [user.id]
        }

        const attendanceResult = await db.query(attendanceQuery, params)
        const attendanceData = attendanceResult.rows[0]

        const present = parseInt(attendanceData.present_count || '0')
        const late = parseInt(attendanceData.late_count || '0')
        const absent = parseInt(attendanceData.explicit_absent_count || '0')

        // Total = only actual records that exist in DB (present + late + explicit absent)
        // We do NOT multiply enrolled × school_days — that inflates the number meaninglessly
        const total = present + late + absent

        // Attendance rate = present out of all actual records
        const attendanceRate = total > 0
            ? ((present / total) * 100).toFixed(2)
            : '0.00'

        return NextResponse.json({
            success: true,
            data: {
                present,
                late,
                absent,
                total,
                attendanceRate: parseFloat(attendanceRate)
            }
        })
    } catch (error) {
        console.error('Error fetching attendance summary:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch attendance summary'
        }, { status: 500 })
    }
}
