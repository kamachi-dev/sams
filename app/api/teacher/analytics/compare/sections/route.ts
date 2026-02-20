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
        const courseId = searchParams.get('course')

        if (!courseId) {
            return NextResponse.json({
                success: false,
                error: 'Course parameter is required'
            }, { status: 400 })
        }

        // Verify teacher owns this course
        const courseCheck = await db.query(
            `SELECT id, name FROM course WHERE id = $1 AND teacher = $2 AND school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [courseId, user.id]
        )

        if (courseCheck.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Course not found or not assigned to you'
            }, { status: 404 })
        }

        // Get all sections for this course
        const sectionsResult = await db.query(`
            SELECT DISTINCT COALESCE(sd.section, 'Unassigned') as section
            FROM enrollment_data e
            INNER JOIN account a ON e.student = a.id
            LEFT JOIN student_data sd ON sd.student = a.id
            WHERE e.course = $1
            ORDER BY section
        `, [courseId])

        const sections = sectionsResult.rows.map(r => r.section)

        // For each section, calculate attendance rate and breakdown
        const sectionStats = await Promise.all(sections.map(async (section) => {
            // Get enrolled students count in this section
            const enrolledResult = await db.query(`
                SELECT COUNT(DISTINCT e.student) as enrolled_count
                FROM enrollment_data e
                INNER JOIN account a ON e.student = a.id
                LEFT JOIN student_data sd ON sd.student = a.id
                WHERE e.course = $1 AND COALESCE(sd.section, 'Unassigned') = $2
            `, [courseId, section])
            const enrolledCount = parseInt(enrolledResult.rows[0]?.enrolled_count || '0')

            // Get explicit attendance counts from DB only (no formula inference)
            // absent = only rows with attendance=0 (camera pushes these at class end)
            const attendanceResult = await db.query(`
                SELECT 
                    COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                    COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                    COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_count
                FROM record r
                INNER JOIN course c ON r.course = c.id
                INNER JOIN student_data sd ON r.student = sd.student
                WHERE c.id = $1
                  AND COALESCE(sd.section, 'Unassigned') = $2
                  AND r.time IS NOT NULL
            `, [courseId, section])

            const presentCount = parseInt(attendanceResult.rows[0]?.present_count || '0')
            const lateCount = parseInt(attendanceResult.rows[0]?.late_count || '0')
            const absentCount = parseInt(attendanceResult.rows[0]?.absent_count || '0')
            const totalRecords = presentCount + lateCount + absentCount
            const attendanceRate = totalRecords > 0
                ? Math.round((presentCount / totalRecords) * 100 * 10) / 10
                : 0

            return {
                section,
                studentCount: enrolledCount,
                presentCount,
                lateCount,
                absentCount,
                attendanceRate
            }
        }))

        // Calculate overall course average for reference
        const totalPresent = sectionStats.reduce((sum, s) => sum + s.presentCount, 0)
        const totalRecordsAll = sectionStats.reduce((sum, s) => sum + s.presentCount + s.lateCount + s.absentCount, 0)
        const courseAvgRate = totalRecordsAll > 0
            ? Math.round((totalPresent / totalRecordsAll) * 100 * 10) / 10
            : 0

        // Get monthly breakdown per section for trend chart
        const monthlyResult = await db.query(`
            SELECT 
                COALESCE(sd.section, 'Unassigned') as section,
                TO_CHAR(r.time, 'Mon') as month,
                EXTRACT(MONTH FROM r.time) as month_num,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_count
            FROM record r
            INNER JOIN course c ON r.course = c.id
            INNER JOIN student_data sd ON r.student = sd.student
            WHERE c.id = $1
              AND r.time IS NOT NULL
            GROUP BY sd.section, TO_CHAR(r.time, 'Mon'), EXTRACT(MONTH FROM r.time)
            ORDER BY month_num
        `, [courseId])

        // Build monthly comparison data
        const monthNums = [...new Set(monthlyResult.rows.map(r => parseInt(r.month_num)))].sort((a, b) => a - b)
        const monthlyComparison = monthNums.map(monthNum => {
            const monthRow = monthlyResult.rows.find(r => parseInt(r.month_num) === monthNum)
            const entry: Record<string, any> = {
                month: monthRow?.month || '',
            }

            for (const section of sections) {
                const sectionRow = monthlyResult.rows.find(
                    r => parseInt(r.month_num) === monthNum && r.section === section
                )
                if (sectionRow) {
                    const present = parseInt(sectionRow.present_count)
                    const late = parseInt(sectionRow.late_count)
                    const absent = parseInt(sectionRow.absent_count)
                    const total = present + late + absent
                    entry[section] = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0
                } else {
                    entry[section] = 0
                }
            }

            return entry
        })

        return NextResponse.json({
            success: true,
            data: {
                courseName: courseCheck.rows[0].name,
                sections: sectionStats,
                courseAvgRate,
                monthlyComparison,
                sectionNames: sections
            }
        })
    } catch (error) {
        console.error('Error fetching section comparison:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch section comparison'
        }, { status: 500 })
    }
}
