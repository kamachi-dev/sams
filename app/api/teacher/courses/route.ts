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

        // Get all courses for this teacher with section and student counts
        const result = await db.query(`
            SELECT 
                c.id, 
                c.name, 
                c.schedule,
                COUNT(DISTINCT e.student) as student_count,
                COUNT(DISTINCT COALESCE(sd.section, 'Unassigned')) as section_count,
                ARRAY_AGG(DISTINCT COALESCE(sd.section, 'Unassigned') ORDER BY COALESCE(sd.section, 'Unassigned')) as section_names
            FROM course c
            LEFT JOIN enrollment_data e ON e.course = c.id
            LEFT JOIN student_data sd ON sd.student = e.student
            WHERE c.teacher = $1
            GROUP BY c.id, c.name, c.schedule
            ORDER BY c.name
        `, [user.id])

        // For each course, get the student count per section
        const coursesWithSections = await Promise.all(result.rows.map(async (row) => {
            const sectionDetails = await db.query(`
                SELECT 
                    COALESCE(sd.section, 'Unassigned') as section,
                    COUNT(DISTINCT e.student) as student_count
                FROM enrollment_data e
                LEFT JOIN student_data sd ON sd.student = e.student
                WHERE e.course = $1
                GROUP BY COALESCE(sd.section, 'Unassigned')
                ORDER BY COALESCE(sd.section, 'Unassigned')
            `, [row.id])

            return {
                id: row.id,
                name: row.name,
                schedule: row.schedule || '',
                studentCount: parseInt(row.student_count || '0'),
                sectionCount: parseInt(row.section_count || '0'),
                sectionNames: row.section_names || [],
                sections: sectionDetails.rows.map((s: any) => ({
                    name: s.section,
                    studentCount: parseInt(s.student_count || '0')
                }))
            }
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
