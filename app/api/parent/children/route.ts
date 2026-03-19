export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET: Fetch all children (students) belonging to the current parent
 * Returns: Array of children with id, name, grade_level
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
            SELECT
                a.id,
                a.username as name,
                sd.grade_level,
                (
                    SELECT string_agg(DISTINCT s.name, ', ' ORDER BY s.name)
                    FROM enrollment_data e
                    INNER JOIN section s ON e.section = s.id
                    INNER JOIN course c ON s.course = c.id
                    WHERE e.student = a.id
                      AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                ) as section
            FROM account a
            INNER JOIN student_data sd ON sd.student = a.id
            WHERE sd.parent = $1
            ORDER BY a.username
        `, [user.id])

        const children = result.rows.map(row => ({
            id: row.id,
            name: row.name || 'Unknown',
            gradeLevel: row.grade_level || 'N/A',
            section: row.section || 'N/A'
        }))

        return NextResponse.json({
            success: true,
            data: children
        })
    } catch (error) {
        console.error('Error fetching parent children:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch children'
        }, { status: 500 })
    }
}
