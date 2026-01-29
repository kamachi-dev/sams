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

        // Get overall attendance summary for ALL students in this teacher's courses
        // This is for the semester-wide "Average Attendance Rate"
        // attendance: 1=present, 2=late, 0=absent
        const result = await db.query(`
            SELECT 
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_count,
                COUNT(*) as total_records
            FROM record r
            INNER JOIN course c ON r.course = c.id
            WHERE c.teacher = $1
        `, [user.id])

        const data = result.rows[0]
        const present = parseInt(data.present_count || '0')
        const late = parseInt(data.late_count || '0')
        const absent = parseInt(data.absent_count || '0')
        const total = parseInt(data.total_records || '0')

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
