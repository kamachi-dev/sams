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

        // Find the parent course for this section, then get all sibling sections
        const parentResult = await db.query(
            `SELECT s.course FROM section s WHERE s.id = $1 AND s.teacher = $2`,
            [courseId, user.id]
        )

        if (parentResult.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Course not found or not assigned to you'
            }, { status: 404 })
        }

        const parentCourseId = parentResult.rows[0].course

        // Get course name
        const courseNameResult = await db.query(
            `SELECT name FROM course WHERE id = $1 AND school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [parentCourseId]
        )

        if (courseNameResult.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Course not found in active school year'
            }, { status: 404 })
        }

        const courseName = courseNameResult.rows[0].name

        // Get all sibling sections of this course taught by this teacher
        const sectionsResult = await db.query(`
            SELECT s.id, s.name
            FROM section s
            WHERE s.course = $1 AND s.teacher = $2
            ORDER BY s.name
        `, [parentCourseId, user.id])

        const sections = sectionsResult.rows // { id, name }

        // For each section, calculate attendance rate and breakdown
        const sectionStats = await Promise.all(sections.map(async (sec) => {
            // Get enrolled students count
            const enrolledResult = await db.query(`
                SELECT COUNT(DISTINCT e.student) as enrolled_count
                FROM enrollment_data e
                WHERE e.section = $1
            `, [sec.id])
            const enrolledCount = parseInt(enrolledResult.rows[0]?.enrolled_count || '0')

            // Get attendance counts from records
            const attendanceResult = await db.query(`
                SELECT 
                    COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                    COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                    COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_count
                FROM record r
                WHERE r.course = $1
                  AND r.time IS NOT NULL
            `, [sec.id])

            const presentCount = parseInt(attendanceResult.rows[0]?.present_count || '0')
            const lateCount = parseInt(attendanceResult.rows[0]?.late_count || '0')
            const absentCount = parseInt(attendanceResult.rows[0]?.absent_count || '0')
            const totalRecords = presentCount + lateCount + absentCount
            const attendanceRate = totalRecords > 0
                ? Math.round((presentCount / totalRecords) * 100 * 10) / 10
                : 0

            return {
                section: sec.name,
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
        const sectionIds = sections.map(s => s.id)
        const monthlyResult = await db.query(`
            SELECT 
                r.course as section_id,
                TO_CHAR(r.time, 'Mon') as month,
                EXTRACT(MONTH FROM r.time) as month_num,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_count
            FROM record r
            WHERE r.course = ANY($1::uuid[])
              AND r.time IS NOT NULL
            GROUP BY r.course, TO_CHAR(r.time, 'Mon'), EXTRACT(MONTH FROM r.time)
            ORDER BY month_num
        `, [sectionIds])

        // Build a map from section ID to section name
        const sectionNameMap: Record<string, string> = {}
        for (const sec of sections) {
            sectionNameMap[sec.id] = sec.name
        }

        // Build monthly comparison data
        const monthNums = [...new Set(monthlyResult.rows.map(r => parseInt(r.month_num)))].sort((a, b) => a - b)
        const sectionNames = sections.map(s => s.name)
        const monthlyComparison = monthNums.map(monthNum => {
            const monthRow = monthlyResult.rows.find(r => parseInt(r.month_num) === monthNum)
            const entry: Record<string, any> = {
                month: monthRow?.month || '',
            }

            for (const sec of sections) {
                const sectionRow = monthlyResult.rows.find(
                    r => parseInt(r.month_num) === monthNum && r.section_id === sec.id
                )
                if (sectionRow) {
                    const present = parseInt(sectionRow.present_count)
                    const late = parseInt(sectionRow.late_count)
                    const absent = parseInt(sectionRow.absent_count)
                    const total = present + late + absent
                    entry[sec.name] = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0
                } else {
                    entry[sec.name] = 0
                }
            }

            return entry
        })

        return NextResponse.json({
            success: true,
            data: {
                courseName,
                sections: sectionStats,
                courseAvgRate,
                monthlyComparison,
                sectionNames
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
