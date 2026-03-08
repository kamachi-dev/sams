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

        // Get attendance by course for enrolled courses only
        // attendance: 1=present, 2=late, 0=absent
        const result = await db.query(`
            SELECT 
                s.id as course_id,
                c.name as course_name,
                s.name as section_name,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent,
                COUNT(*) as total_records
            FROM enrollment_data e
            INNER JOIN section s ON e.section = s.id
            INNER JOIN course c ON s.course = c.id
            LEFT JOIN record r ON r.course = s.id AND r.student = e.student
            WHERE e.student = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
            GROUP BY s.id, c.name, s.name
            ORDER BY c.name, s.name
        `, [user.id])

        const courses = result.rows.map(row => {
            const present = parseInt(row.present || '0')
            const late = parseInt(row.late || '0')
            const absent = parseInt(row.absent || '0')
            const total = parseInt(row.total_records || '0')

            // Attendance rate = present out of all actual records (matches teacher portal)
            const percentage = total > 0
                ? ((present / total) * 100).toFixed(1)
                : '0.0'

            return {
                courseId: row.course_id,
                course: row.course_name,
                present,
                late,
                absent,
                percentage: parseFloat(percentage)
            }
        })

        return NextResponse.json({
            success: true,
            data: courses
        })
    } catch (error) {
        console.error('Error fetching course attendance:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch course attendance'
        }, { status: 500 })
    }
}
