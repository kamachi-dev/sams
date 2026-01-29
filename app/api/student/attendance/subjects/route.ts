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

        // Get attendance by subject for enrolled courses only
        // attendance: 1=present, 2=late, 0=absent
        const result = await db.query(`
            SELECT 
                c.name as subject,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent,
                COUNT(*) as total_records
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            LEFT JOIN record r ON r.course = c.id AND r.student = e.student
            WHERE e.student = $1
            GROUP BY c.id, c.name
            ORDER BY c.name
        `, [user.id])

        const subjects = result.rows.map(row => {
            const present = parseInt(row.present || '0')
            const late = parseInt(row.late || '0')
            const absent = parseInt(row.absent || '0')
            const total = parseInt(row.total_records || '0')
            
            // New attendance rate calculation:
            // Present = 1 (100%), Late = 0.5 (50%), Absent = 0 (0%)
            const percentage = total > 0 
                ? (((present * 1) + (late * 0.5) + (absent * 0)) / total * 100).toFixed(1)
                : '0.0'

            return {
                subject: row.subject,
                present,
                late,
                absent,
                percentage: parseFloat(percentage)
            }
        })

        return NextResponse.json({ 
            success: true, 
            data: subjects
        })
    } catch (error) {
        console.error('Error fetching subject attendance:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch subject attendance'
        }, { status: 500 })
    }
}
