export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(req: Request) {
    try {
        const user = await currentUser()
        
        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'Not authenticated' 
            }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const courseFilter = searchParams.get('course')

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0]
        
        console.log('=== TODAY API DEBUG ===')
        console.log('Today:', today)
        console.log('Course:', courseFilter)
        console.log('UserId:', user.id)

        // Get total enrolled students
        const totalQuery = courseFilter
            ? `SELECT COUNT(DISTINCT e.student) as total_students
               FROM enrollment_data e
               INNER JOIN course c ON e.course = c.id
               WHERE c.teacher = $1 AND c.id = $2`
            : `SELECT COUNT(DISTINCT e.student) as total_students
               FROM enrollment_data e
               INNER JOIN course c ON e.course = c.id
               WHERE c.teacher = $1`
        
        const totalParams = courseFilter ? [user.id, courseFilter] : [user.id]
        const totalResult = await db.query(totalQuery, totalParams)

        // Get today's attendance for students in this teacher's courses
        // For students enrolled in multiple courses, pick their BEST attendance status:
        // present (1) > late (2) > absent (0)
        // Note: attendance column is smallint (1=present, 2=late, 0/NULL=absent)
        const attendanceQuery = courseFilter
            ? `WITH student_courses AS (
                -- Get all distinct students enrolled in the filtered course
                SELECT DISTINCT e.student
                FROM enrollment_data e
                INNER JOIN course c ON e.course = c.id
                WHERE c.teacher = $2 AND c.id = $3
            ),
            student_best_attendance AS (
                -- For each student, get their BEST attendance for THIS SPECIFIC COURSE today
                -- Use MIN since present(1) < late(2), so MIN gives best status
                SELECT 
                    sc.student,
                    MIN(COALESCE(r.attendance, 0)) as best_attendance
                FROM student_courses sc
                LEFT JOIN record r ON r.student = sc.student 
                    AND r.created_at IS NOT NULL
                    AND DATE(r.created_at) = $1
                    AND r.course = $3
                GROUP BY sc.student
            )
            SELECT 
                COUNT(CASE WHEN best_attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN best_attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN best_attendance = 0 THEN 1 END) as absent_count
            FROM student_best_attendance`
            : `WITH student_courses AS (
                -- Get all distinct students enrolled in any of this teacher's courses
                SELECT DISTINCT e.student
                FROM enrollment_data e
                INNER JOIN course c ON e.course = c.id
                WHERE c.teacher = $2
            ),
            teacher_courses AS (
                -- Get all course IDs taught by this teacher
                SELECT id FROM course WHERE teacher = $2
            ),
            student_best_attendance AS (
                -- For each student, get their BEST attendance across all courses today
                SELECT 
                    sc.student,
                    MIN(COALESCE(r.attendance, 0)) as best_attendance
                FROM student_courses sc
                LEFT JOIN record r ON r.student = sc.student 
                    AND r.created_at IS NOT NULL
                    AND DATE(r.created_at) = $1
                    AND r.course IN (SELECT id FROM teacher_courses)
                GROUP BY sc.student
            )
            SELECT 
                COUNT(CASE WHEN best_attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN best_attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN best_attendance = 0 THEN 1 END) as absent_count
            FROM student_best_attendance`
        
        const attendanceParams = courseFilter ? [today, user.id, courseFilter] : [today, user.id]
        const result = await db.query(attendanceQuery, attendanceParams)
        
        console.log('Query params:', attendanceParams)
        console.log('Result:', result.rows[0])

        const data = result.rows[0]
        const total = parseInt(totalResult.rows[0]?.total_students || '0')
        const present = parseInt(data.present_count || '0')
        const late = parseInt(data.late_count || '0')
        const absent = parseInt(data.absent_count || '0')

        // New attendance rate calculation:
        // Present = 1 (100%), Late = 0.5 (50%), Absent = 0 (0%)
        // Example: 1 present + 1 late = (1 + 0.5) / 2 = 75%
        const attendanceRate = total > 0 
            ? (((present * 1) + (late * 0.5) + (absent * 0)) / total * 100).toFixed(1)
            : '0.0'

        return NextResponse.json({ 
            success: true, 
            data: {
                present: present,
                late: late,
                absent: absent,
                total: total,
                attendanceRate: parseFloat(attendanceRate)
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
