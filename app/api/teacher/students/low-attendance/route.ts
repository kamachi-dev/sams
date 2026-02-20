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
        const sectionFilter = searchParams.get('section')
        const threshold = parseFloat(searchParams.get('threshold') || '50')

        // Build dynamic WHERE clauses based on filters
        const conditions: string[] = ['c.teacher = $1', `c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`]
        const params: any[] = [user.id]
        let paramIdx = 2

        if (courseFilter) {
            conditions.push(`c.id = $${paramIdx++}`)
            params.push(courseFilter)
        }
        if (sectionFilter) {
            conditions.push(`sd.section = $${paramIdx++}`)
            params.push(sectionFilter)
        }
        // threshold param added last
        const thresholdIdx = paramIdx

        const whereClause = conditions.join(' AND ')

        // Per-student attendance counts using explicit DB records only.
        // school_days = distinct days this student has ANY record (present/late/absent).
        // absent_count = explicit attendance=0 records only (camera pushes these at class end).
        // attendance_rate = present / school_days (only present counts toward the rate).
        const query = `
            WITH student_attendance AS (
                SELECT
                    a.id           AS student_id,
                    a.username     AS student_name,
                    a.email        AS student_email,
                    c.id           AS course_id,
                    c.name         AS course_name,
                    COUNT(DISTINCT CASE WHEN r.attendance IS NOT NULL THEN DATE(r.time) END) AS school_days,
                    COUNT(CASE WHEN r.attendance = 1 THEN 1 END) AS present_count,
                    COUNT(CASE WHEN r.attendance = 2 THEN 1 END) AS late_count,
                    COUNT(CASE WHEN r.attendance = 0 THEN 1 END) AS absent_count
                FROM enrollment_data e
                INNER JOIN course c ON e.course = c.id
                INNER JOIN account a ON e.student = a.id
                INNER JOIN student_data sd ON sd.student = a.id
                LEFT JOIN record r ON r.student = a.id
                    AND r.course = c.id
                    AND r.time IS NOT NULL
                WHERE ${whereClause}
                GROUP BY a.id, a.username, a.email, c.id, c.name
            )
            SELECT
                student_id,
                student_name,
                student_email,
                course_id,
                course_name,
                school_days      AS total_records,
                present_count,
                late_count,
                absent_count,
                CASE
                    WHEN school_days > 0 THEN
                        ROUND((present_count * 1.0 / school_days * 100)::numeric, 1)
                    ELSE 0
                END AS attendance_rate
            FROM student_attendance
            WHERE school_days > 0
              AND CASE
                    WHEN school_days > 0 THEN (present_count * 1.0 / school_days * 100)
                    ELSE 0
                  END < $${thresholdIdx}
            ORDER BY attendance_rate ASC, student_name ASC
        `

        params.push(threshold)

        const result = await db.query(query, params)

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
            threshold
        })
    } catch (error) {
        console.error('Error fetching low attendance students:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch low attendance students'
        }, { status: 500 })
    }
}
