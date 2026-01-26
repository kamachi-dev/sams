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

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0]

        // Get total enrolled students
        const totalResult = await db.query(`
            SELECT COUNT(DISTINCT e.student) as total_students
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            WHERE c.teacher = $1
        `, [user.id])

        // Get today's attendance for students in this teacher's courses
        // For students enrolled in multiple courses, pick their BEST attendance status:
        // present (1) > late (2) > absent (0)
        // Note: attendance column is smallint (1=present, 2=late, 0/NULL=absent)
        const result = await db.query(`
            WITH student_best_attendance AS (
                SELECT 
                    e.student,
                    MIN(COALESCE(r.attendance, 0)) as best_attendance
                FROM enrollment_data e
                INNER JOIN course c ON e.course = c.id
                LEFT JOIN record r ON r.student = e.student 
                    AND DATE(r.time) = $1
                    AND r.course = c.id
                WHERE c.teacher = $2
                GROUP BY e.student
            )
            SELECT 
                COUNT(CASE WHEN best_attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN best_attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN best_attendance = 0 THEN 1 END) as absent_count
            FROM student_best_attendance
        `, [today, user.id])

        const data = result.rows[0]
        const total = parseInt(totalResult.rows[0]?.total_students || '0')
        const present = parseInt(data.present_count || '0')
        const late = parseInt(data.late_count || '0')
        const absent = parseInt(data.absent_count || '0')

        return NextResponse.json({ 
            success: true, 
            data: {
                present: present,
                late: late,
                absent: absent,
                total: total
            }
        })
    } catch (error) {
        console.error('Error fetching today\'s attendance:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch today\'s attendance'
        }, { status: 500 })
    }
}
