export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET: Derive and return notifications from attendance records
 * Notifications are generated from late/absent records (not stored in DB)
 * Returns: Array of notification objects with type, course, message, etc.
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

        // Fetch recent late/absent records
        const result = await db.query(`
            SELECT
                r.id,
                r.time,
                r.attendance,
                r.confidence,
                c.name as course_name,
                s.name as section_name,
                COALESCE(a.username, '') as prof_name
            FROM record r
            INNER JOIN section s ON r.course = s.id
            INNER JOIN course c ON s.course = c.id
            LEFT JOIN account a ON s.teacher = a.id
            INNER JOIN enrollment_data e ON e.section = s.id AND e.student = r.student
            LEFT JOIN meta m ON 1=1
            WHERE r.student = $1
              AND r.attendance IN (0, 2)
              AND (m.active_school_year IS NULL OR c.school_year = m.active_school_year)
              AND r.time >= NOW() - INTERVAL '30 days'
            ORDER BY r.time DESC
            LIMIT 50
        `, [user.id])

        const notificationTemplates = {
            late: 'You have been recorded as late for {course}. Continued tardiness may negatively affect your attendance record.',
            absent: 'You were marked absent during {course} class. Regular attendance is required to keep up with lessons.'
        }

        const notifications = result.rows.map(row => {
            const type = row.attendance === 2 ? 'late' : 'absent'
            const templateMessage = notificationTemplates[type as keyof typeof notificationTemplates]
            const message = templateMessage.replace('{course}', row.course_name)

            // Determine semester based on month
            const month = new Date(row.time).getMonth() + 1
            const semester = (month >= 7 || month <= 6) ? 'first' : 'second'

            return {
                id: `record-${row.id}`,
                type,
                course: row.course_name,
                prof: row.prof_name || 'Unknown',
                time: new Date(row.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                date: new Date(row.time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                message,
                semester,
                confidence: row.confidence != null ? parseFloat(row.confidence).toFixed(2) : null
            }
        })

        return NextResponse.json({
            success: true,
            data: notifications
        })
    } catch (error) {
        console.error('Error fetching student notifications:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch notifications'
        }, { status: 500 })
    }
}
