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

        // Get all sections for this teacher with course info and student counts
        const result = await db.query(`
            SELECT 
                s.id, 
                c.name, 
                s.schedule,
                s.name as section_name,
                COUNT(DISTINCT e.student) as student_count
            FROM section s
            INNER JOIN course c ON s.course = c.id
            LEFT JOIN enrollment_data e ON e.section = s.id
            WHERE s.teacher = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
            GROUP BY s.id, c.name, s.schedule, s.name
            ORDER BY c.name, s.name
        `, [user.id])

        const coursesWithSections = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            schedule: row.schedule || '',
            sectionName: row.section_name || '',
            studentCount: parseInt(row.student_count || '0'),
            sectionCount: 1,
            sectionNames: [row.section_name || ''],
            sections: [{
                name: row.section_name || '',
                studentCount: parseInt(row.student_count || '0')
            }]
        }))

        return NextResponse.json({
            success: true,
            data: coursesWithSections
        })
    } catch (error) {
        console.error('Error fetching teacher courses:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch courses'
        }, { status: 500 })
    }
}
