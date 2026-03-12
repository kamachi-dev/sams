export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET: Fetch daily attendance records for a specific child (last 7 days)
 * Verifies that the parent owns this child
 * Returns: Array of record objects with date, course, time, status, etc.
 */
export async function GET(
    request: Request,
    { params }: { params: { childId: string } }
) {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Not authenticated'
            }, { status: 401 })
        }

        const childId = params.childId

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
                  AND r.time >= NOW() - INTERVAL '7 days'
                  AND r.time IS NOT NULL
                ORDER BY r.id
            ) sub
            ORDER BY sub.time DESC
        `, [childId])

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
        console.error('Error fetching child daily attendance:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch daily records'
        }, { status: 500 })
    }
}
