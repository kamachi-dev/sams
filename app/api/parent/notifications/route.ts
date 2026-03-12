export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET: Derive and return notifications for all parent's children
 * Notifications are generated from late/absent records (not stored in DB)
 * Returns: Array of notification objects with type, course, message, student info, etc.
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

        // Fetch recent late/absent records for all parent's children
        const result = await db.query(`
            SELECT
                r.id,
                r.time,
                r.attendance,
                r.confidence,
                r.student,
                a.username as student_name,
                c.name as course_name,
                c.school_year as school_year_id,
                s.name as section_name,
                COALESCE(tchr.username, '') as prof_name
            FROM record r
            INNER JOIN account a ON r.student = a.id
            INNER JOIN student_data sd ON sd.student = a.id
            INNER JOIN section s ON r.course = s.id
            INNER JOIN course c ON s.course = c.id
            LEFT JOIN account tchr ON s.teacher = tchr.id
            INNER JOIN enrollment_data e ON e.section = s.id AND e.student = r.student
            LEFT JOIN meta m ON 1=1
            WHERE sd.parent = $1
              AND r.attendance IN (0, 2)
              AND (m.active_school_year IS NULL OR c.school_year = m.active_school_year)
              AND r.time >= NOW() - INTERVAL '30 days'
            ORDER BY r.time DESC
            LIMIT 100
        `, [user.id])

        const notificationTemplates = {
            late: 'Has been recorded as late for {course}. Continued tardiness may negatively affect their attendance record.',
            absent: 'Was marked absent during {course} class. Regular attendance is required to keep up with lessons.'
        }

        const notifications = result.rows.map(row => {
            const type = row.attendance === 2 ? 'late' : 'absent'
            const templateMessage = notificationTemplates[type as keyof typeof notificationTemplates]
            const message = templateMessage.replace('{course}', row.course_name)

            // Determine semester based on month
            const month = new Date(row.time).getMonth() + 1
            const semester = (month >= 7 || month <= 6) ? 'first' : 'second'

            // Get display school year from date
            const year = new Date(row.time).getFullYear()
            const nextYear = year + 1
            const schoolYear = month >= 7 ? `${year}-${nextYear}` : `${year - 1}-${year}`

            return {
                id: `record-${row.id}`,
                type,
                course: row.course_name,
                prof: row.prof_name || 'Unknown',
                studentName: row.student_name,
                studentId: row.student,
                schoolYearId: row.school_year_id,
                time: new Date(row.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                date: new Date(row.time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                message,
                semester,
                schoolYear,
                confidence: row.confidence != null ? parseFloat(row.confidence).toFixed(2) : null
            }
        })

        return NextResponse.json({
            success: true,
            data: notifications
        })
    } catch (error) {
        console.error('Error fetching parent notifications:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch notifications'
        }, { status: 500 })
    }
}
