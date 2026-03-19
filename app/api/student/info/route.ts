export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
    try {
        const user = await currentUser()
        
        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'Not authenticated' 
            }, { status: 401 })
        }

        // Get student account info, grade level, and section(s)
        const result = await db.query(`
            SELECT 
                a.username,
                a.email,
                a.pfp,
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
            LEFT JOIN student_data sd ON sd.student = a.id
            WHERE a.id = $1
        `, [user.id])

        if (result.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Student not found'
            }, { status: 404 })
        }

        return NextResponse.json({ 
            success: true, 
            data: result.rows[0]
        })
    } catch (error) {
        console.error('Error fetching student info:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch student info'
        }, { status: 500 })
    }
}
