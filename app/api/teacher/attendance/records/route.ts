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

        // Get query parameters for filtering
        const { searchParams } = new URL(req.url)
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
        const courseFilter = searchParams.get('course') // Required course filter

        if (!courseFilter) {
            return NextResponse.json({
                success: false,
                error: 'Course parameter is required'
            }, { status: 400 })
        }

        // Get ALL students enrolled in the specified course, with their attendance records if they exist
        // Note: attendance column is smallint (1=present, 2=late, 0/NULL=absent)
        const result = await db.query(`
            SELECT 
                a.id,
                a.username,
                a.email,
                c.name as course_name,
                r.attendance,
                r.time,
                r.confidence
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            INNER JOIN account a ON e.student = a.id
            LEFT JOIN record r ON r.student = a.id 
                AND DATE(r.time) = $1
                AND r.course = c.id
            WHERE c.teacher = $2 AND c.id = $3
            ORDER BY 
                CASE 
                    WHEN r.attendance = 1 THEN 1
                    WHEN r.attendance = 2 THEN 2
                    WHEN r.attendance = 0 THEN 3
                    WHEN r.attendance IS NULL THEN 4
                    ELSE 5
                END,
                a.username
        `, [date, user.id, courseFilter])

        const records = result.rows.map(row => {
            let status = 'absent'
            if (row.attendance === 1) status = 'present'
            else if (row.attendance === 2) status = 'late'
            else if (row.attendance === 0) status = 'absent'
            
            return {
                id: row.id,
                name: row.username,
                email: row.email,
                course: row.course_name,
                status: status,
                time: row.time ? new Date(row.time).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                }) : '-',
                confidence: row.confidence ? `${Math.round(row.confidence)}%` : 'No Detection'
            }
        })

        return NextResponse.json({ 
            success: true, 
            data: records
        })
    } catch (error) {
        console.error('Error fetching attendance records:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch attendance records'
        }, { status: 500 })
    }
}
