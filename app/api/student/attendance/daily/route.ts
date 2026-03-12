export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET: Fetch daily attendance records for the student (last 7 days)
 * Returns: Array of record objects with date, course, time, status, etc.
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

        const result = await db.query(`
            SELECT * FROM (
                SELECT DISTINCT ON (r.id)
                    r.id,
                    r.time,
                    r.attendance,
                    r.confidence,
                    r.course,
                    c.name as course_name,
                    s.name as section_name,
                    COALESCE(a.username, '') as prof_name
                FROM record r
                INNER JOIN section s ON r.course = s.id
                INNER JOIN course c ON s.course = c.id
                LEFT JOIN account a ON s.teacher = a.id
                INNER JOIN enrollment_data e ON e.section = s.id AND e.student = r.student
                WHERE r.student = $1
                  AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                  AND r.time::date = CURRENT_DATE
                  AND r.time IS NOT NULL
                ORDER BY r.id
            ) sub
            ORDER BY sub.time DESC
        `, [user.id])

        const records = result.rows.map(row => {
            let status = 'Absent'
            if (row.attendance === 1) status = 'Present'
            else if (row.attendance === 2) status = 'Late'

            const recordTime = new Date(row.time)
            const date = recordTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const time = recordTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

            // Mock class times for now (could be added to section table)
            const classStart = '7:30 AM'
            const classEnd = '8:30 AM'

            return {
                id: row.id,
                date,
                course: row.course_name,
                prof: row.prof_name || 'Unknown',
                classStart,
                classEnd,
                recordedTime: time,
                status,
                confidence: row.confidence != null ? parseFloat(row.confidence).toFixed(2) : null
            }
        })

        return NextResponse.json({
            success: true,
            data: records
        })
    } catch (error) {
        console.error('Error fetching daily attendance records:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch daily records'
        }, { status: 500 })
    }
}
