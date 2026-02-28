export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * Returns the student's detection log — one best record per course per day.
 * Each row includes: course name, date, time, attendance status, confidence.
 */
export async function GET() {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Not authenticated'
            }, { status: 401 })
        }

        // Best attendance record per course per day (deduplicated)
        const result = await db.query(`
            SELECT * FROM (
                SELECT DISTINCT ON (r.course, DATE(r.time))
                    r.course,
                    c.name as course_name,
                    r.time,
                    r.attendance,
                    r.confidence
                FROM record r
                INNER JOIN course c ON r.course = c.id
                INNER JOIN enrollment_data e ON e.course = c.id AND e.student = r.student
                WHERE r.student = $1
                  AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                  AND r.time IS NOT NULL
                ORDER BY r.course, DATE(r.time),
                    CASE r.attendance WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 0 THEN 3 ELSE 4 END ASC
            ) sub
            ORDER BY sub.time DESC, sub.course_name ASC
        `, [user.id])

        const records = result.rows.map(row => {
            let status = 'Absent'
            if (row.attendance === 1) status = 'Present'
            else if (row.attendance === 2) status = 'Late'

            return {
                course: row.course_name,
                date: row.time
                    ? new Date(row.time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '-',
                time: row.time
                    ? new Date(row.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
                    : '-',
                status,
                confidence: row.confidence != null ? row.confidence : null
            }
        })

        return NextResponse.json({
            success: true,
            data: records
        })
    } catch (error) {
        console.error('Error fetching student detection records:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch detection records'
        }, { status: 500 })
    }
}
