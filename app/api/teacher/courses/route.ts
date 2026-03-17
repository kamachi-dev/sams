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

        // Get all courses for this teacher, grouped by parent course.
        // One card per course — sections are nested inside.
        // Uses array_agg to pick a representative section ID (first alphabetically)
        // compatible with the sections API which accepts any section ID in the course.
        const result = await db.query(`
            WITH section_counts AS (
                SELECT
                    s.id,
                    s.name,
                    s.schedule,
                    s.course AS course_id,
                    COUNT(DISTINCT e.student) AS student_count
                FROM section s
                LEFT JOIN enrollment_data e ON e.section = s.id
                WHERE s.teacher = $1
                GROUP BY s.id, s.name, s.schedule, s.course
            )
            SELECT
                c.id                                          AS course_id,
                c.name,
                (array_agg(sc.id ORDER BY sc.name))[1]       AS representative_section_id,
                COUNT(DISTINCT sc.id)                        AS section_count,
                SUM(sc.student_count)                        AS total_students,
                json_agg(
                    json_build_object(
                        'id',           sc.id,
                        'name',         sc.name,
                        'schedule',     sc.schedule,
                        'studentCount', sc.student_count
                    ) ORDER BY sc.name
                )                                            AS sections
            FROM section_counts sc
            INNER JOIN course c ON sc.course_id = c.id
            WHERE c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
            GROUP BY c.id, c.name
            ORDER BY c.name
        `, [user.id])

        const coursesWithSections = result.rows.map(row => {
            const sections: Array<{ id: string; name: string; schedule: string; studentCount: number }> =
                row.sections || []
            return {
                id: row.representative_section_id as string,
                courseId: row.course_id as string,
                name: row.name as string,
                schedule: sections.length === 1
                    ? (sections[0].schedule || '')
                    : (sections.every(s => s.schedule === sections[0].schedule)
                        ? (sections[0].schedule || '')
                        : ''),
                sectionCount: parseInt(row.section_count || '0'),
                studentCount: parseInt(row.total_students || '0'),
                sectionNames: sections.map(s => s.name),
                sections: sections.map(s => ({
                    id: s.id,
                    name: s.name,
                    schedule: s.schedule || '',
                    studentCount: s.studentCount
                }))
            }
        })

        return NextResponse.json({
            success: true,
            data: coursesWithSections
        })
    } catch (error) {
        console.error('Error fetching teacher courses:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch courses'
        }, { status: 500 })
    }
}
