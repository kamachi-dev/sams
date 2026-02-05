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

        // Get overall attendance summary for students in this teacher's courses
        // This is for the semester-wide "Average Attendance Rate"
        // We need to count all attendance including absences for students without records
        
        // First, get the count of present and late records
        const attendanceQuery = courseFilter
            ? `SELECT 
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as explicit_absent_count
            FROM record r
            INNER JOIN course c ON r.course = c.id
            WHERE c.teacher = $1 AND c.id = $2`
            : `SELECT 
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as explicit_absent_count
            FROM record r
            INNER JOIN course c ON r.course = c.id
            WHERE c.teacher = $1`
        
        // Get total enrolled students and count of school days with records
        const totalQuery = courseFilter
            ? `SELECT 
                COUNT(DISTINCT e.student) as enrolled_count,
                COUNT(DISTINCT DATE(r.created_at)) as school_days
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            LEFT JOIN record r ON r.course = c.id 
                AND r.created_at IS NOT NULL
            WHERE c.teacher = $1 AND c.id = $2`
            : `SELECT 
                COUNT(DISTINCT e.student) as enrolled_count,
                COUNT(DISTINCT DATE(r.created_at)) as school_days
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            LEFT JOIN record r ON r.course = c.id
                AND r.created_at IS NOT NULL
            WHERE c.teacher = $1`
        
        const params = courseFilter ? [user.id, courseFilter] : [user.id]
        
        const [attendanceResult, totalResult] = await Promise.all([
            db.query(attendanceQuery, params),
            db.query(totalQuery, params)
        ])

        const attendanceData = attendanceResult.rows[0]
        const totalData = totalResult.rows[0]
        
        const present = parseInt(attendanceData.present_count || '0')
        const late = parseInt(attendanceData.late_count || '0')
        const explicitAbsent = parseInt(attendanceData.explicit_absent_count || '0')
        const enrolledCount = parseInt(totalData.enrolled_count || '0')
        const schoolDays = parseInt(totalData.school_days || '0')
        
        // Calculate total expected attendance records
        // Expected = enrolled students × number of school days with records
        const expectedTotal = enrolledCount * schoolDays
        
        // Calculate absent count
        // Absent = expected total - present - late
        // This includes both explicit absent records (attendance=0) and missing records
        const absent = Math.max(0, expectedTotal - present - late)
        const total = expectedTotal

        // New attendance rate calculation:
        // Present = 1 (100%), Late = 0.5 (50%), Absent = 0 (0%)
        // Example: 1 present + 1 late = (1 + 0.5) / 2 = 75%
        const attendanceRate = total > 0 
            ? (((present * 1) + (late * 0.5) + (absent * 0)) / total * 100).toFixed(1)
            : '0.0'

        return NextResponse.json({ 
            success: true, 
            data: {
                present,
                late,
                absent,
                total,
                attendanceRate: parseFloat(attendanceRate)
            }
        })
    } catch (error) {
        console.error('Error fetching attendance summary:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch attendance summary'
        }, { status: 500 })
    }
}
