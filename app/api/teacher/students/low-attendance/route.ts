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
        const conditions: string[] = ['s.teacher = $1', `c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`]
        const params: any[] = [user.id]
        let paramIdx = 2

        if (courseFilter) {
            conditions.push(`s.id = $${paramIdx++}`)
            params.push(courseFilter)
        }
        if (sectionFilter) {
            conditions.push(`s.name = $${paramIdx++}`)
            params.push(sectionFilter)
        }
        // threshold param added last
        const thresholdIdx = paramIdx

        const whereClause = conditions.join(' AND ')

        // Per-student attendance counts using best-status-per-day deduplication.
        // For each student+section+day, keep only the best record: Present(1) > Late(2) > Absent(0).
        // This matches the SF2 export logic exactly.
        // attendance_rate = present / total_records (P + L + A after dedup).
        const query = `
            WITH best_records AS (
                SELECT DISTINCT ON (r.student, r.course, DATE(r.time))
                    r.student,
                    r.course,
                    r.attendance
                FROM record r
                INNER JOIN section s ON r.course = s.id
                INNER JOIN course c ON s.course = c.id
                WHERE ${whereClause}
                  AND r.time IS NOT NULL
                ORDER BY r.student, r.course, DATE(r.time),
                    CASE r.attendance WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 0 THEN 3 ELSE 4 END ASC
            ),
            student_attendance AS (
                SELECT
                    a.id           AS student_id,
                    a.username     AS student_name,
                    a.email        AS student_email,
                    c.id           AS course_id,
                    c.name         AS course_name,
                    s.id           AS section_id,
                    s.name         AS student_section,
                    COUNT(br.attendance)                              AS total_records,
                    COUNT(CASE WHEN br.attendance = 1 THEN 1 END)    AS present_count,
                    COUNT(CASE WHEN br.attendance = 2 THEN 1 END)    AS late_count,
                    COUNT(CASE WHEN br.attendance = 0 THEN 1 END)    AS absent_count
                FROM enrollment_data e
                INNER JOIN section s ON e.section = s.id
                INNER JOIN course c ON s.course = c.id
                INNER JOIN account a ON e.student = a.id
                LEFT JOIN best_records br ON br.student = a.id
                    AND br.course = s.id
                WHERE ${whereClause}
                GROUP BY a.id, a.username, a.email, c.id, c.name, s.id, s.name
            )
            SELECT
                student_id,
                student_name,
                student_email,
                course_id,
                course_name,
                section_id,
                student_section,
                total_records,
                present_count,
                late_count,
                absent_count,
                CASE
                    WHEN total_records > 0 THEN
                        ROUND((present_count * 1.0 / total_records * 100)::numeric, 1)
                    ELSE 0
                END AS attendance_rate
            FROM student_attendance
            WHERE total_records > 0
              AND CASE
                    WHEN total_records > 0 THEN (present_count * 1.0 / total_records * 100)
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
            sectionId: row.section_id,
            section: row.student_section || '',
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
