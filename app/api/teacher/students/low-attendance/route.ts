export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(req: Request) {
    try {
        const user = await currentUser()
        
        console.log('Low Attendance API - User:', user ? { id: user.id, email: user.emailAddresses?.[0]?.emailAddress } : 'NULL')
        
        if (!user) {
            console.error('Low Attendance API - Authentication failed: No user found')
            return NextResponse.json({ 
                success: false, 
                error: 'Not authenticated' 
            }, { status: 401 })
        }

        // Get query parameters for filtering
        const { searchParams } = new URL(req.url)
        const courseFilter = searchParams.get('course') // Optional course filter
        const threshold = parseFloat(searchParams.get('threshold') || '50') // Default 50%

        // Query to get students with attendance rate below threshold
        // Attendance calculation: Present = 100%, Late = 50%, Absent = 0%
        // Only include students enrolled in courses taught by this teacher
        let query = `
            WITH student_attendance AS (
                SELECT 
                    a.id as student_id,
                    a.username as student_name,
                    a.email as student_email,
                    c.id as course_id,
                    c.name as course_name,
                    COUNT(r.id) as total_records,
                    COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                    COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                    COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_count
                FROM enrollment_data e
                INNER JOIN course c ON e.course = c.id
                INNER JOIN account a ON e.student = a.id
                LEFT JOIN record r ON r.student = a.id AND r.course = c.id
                WHERE c.teacher = $1
                ${courseFilter ? 'AND c.id = $2' : ''}
                GROUP BY a.id, a.username, a.email, c.id, c.name
            )
            SELECT 
                student_id,
                student_name,
                student_email,
                course_id,
                course_name,
                total_records,
                present_count,
                late_count,
                absent_count,
                CASE 
                    WHEN total_records > 0 THEN 
                        ROUND(((present_count * 1.0 + late_count * 0.5) / total_records * 100)::numeric, 1)
                    ELSE 0
                END as attendance_rate
            FROM student_attendance
            WHERE CASE 
                WHEN total_records > 0 THEN 
                    ((present_count * 1.0 + late_count * 0.5) / total_records * 100)
                ELSE 0
            END < $${courseFilter ? '3' : '2'}
            ORDER BY attendance_rate ASC, student_name ASC
        `

        const params = courseFilter 
            ? [user.id, courseFilter, threshold]
            : [user.id, threshold]

        console.log('Low Attendance Query Params:', { userId: user.id, courseFilter, threshold, params })
        console.log('SQL Query:', query)
        
        const result = await db.query(query, params)
        
        console.log('Query Results:', result.rows.length, 'students found')
        console.log('Raw data:', result.rows)

        const students = result.rows.map(row => ({
            id: row.student_id,
            name: row.student_name,
            email: row.student_email,
            courseId: row.course_id,
            courseName: row.course_name,
            totalRecords: parseInt(row.total_records),
            presentCount: parseInt(row.present_count),
            lateCount: parseInt(row.late_count),
            absentCount: parseInt(row.absent_count),
            attendanceRate: parseFloat(row.attendance_rate)
        }))

        return NextResponse.json({ 
            success: true, 
            data: students,
            threshold: threshold
        })
    } catch (error) {
        console.error('Error fetching low attendance students:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch low attendance students'
        }, { status: 500 })
    }
}
