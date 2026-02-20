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

        // Get attendance summary for the student
        // attendance: 1=present, 2=late, 0=absent
        const result = await db.query(`
            SELECT 
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_days,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_days,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_days,
                COUNT(*) as total_days
            FROM record r
            WHERE r.student = $1
              AND r.course IN (SELECT id FROM course WHERE school_year = (SELECT active_school_year FROM meta WHERE id='1'))
        `, [user.id])

        const data = result.rows[0]
        const presentDays = parseInt(data.present_days || '0')
        const lateDays = parseInt(data.late_days || '0')
        const absentDays = parseInt(data.absent_days || '0')
        const totalDays = parseInt(data.total_days || '0')

        // New attendance rate calculation:
        // Present = 1 (100%), Late = 0.5 (50%), Absent = 0 (0%)
        // Example: 1 present + 1 late = (1 + 0.5) / 2 = 75%
        const attendanceRate = totalDays > 0
            ? (((presentDays * 1) + (lateDays * 0.5) + (absentDays * 0)) / totalDays * 100).toFixed(1)
            : '0.0'

        // Get total courses enrolled
        const enrollmentResult = await db.query(`
            SELECT COUNT(DISTINCT course) as total_courses
            FROM enrollment_data
            WHERE student = $1
              AND course IN (SELECT id FROM course WHERE school_year = (SELECT active_school_year FROM meta WHERE id='1'))
        `, [user.id])

        const totalCourses = parseInt(enrollmentResult.rows[0]?.total_courses || '0')

        return NextResponse.json({
            success: true,
            data: {
                presentDays,
                lateDays,
                absentDays,
                totalDays,
                attendanceRate: parseFloat(attendanceRate),
                totalCourses
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
