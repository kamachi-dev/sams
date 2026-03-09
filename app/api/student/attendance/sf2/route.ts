export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * Student SF2-style API — Returns per-course, per-day attendance data for the signed-in student.
 * Query params:
 *   - month (required): 1-12
 *   - year (required): e.g. 2026
 *
 * Returns:
 *   - studentName, gradeLevel, section
 *   - month, monthNum, year
 *   - schoolDays: array of day-of-month numbers that had records
 *   - courses: array of { courseName, dailyStatus: { [day]: 'P'|'L'|'A'|'ND' },
 *       totalPresent, totalLate, totalAbsent, totalNoDetection, actualRecords }
 *   - detectionLog: array of { courseName, date, time, status, confidence }
 */
export async function GET(req: Request) {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const monthStr = searchParams.get('month')
        const yearStr = searchParams.get('year')

        if (!monthStr || !yearStr) {
            return NextResponse.json({
                success: false,
                error: 'month and year parameters are required'
            }, { status: 400 })
        }

        const month = parseInt(monthStr)
        const year = parseInt(yearStr)

        if (month < 1 || month > 12 || isNaN(year)) {
            return NextResponse.json({ success: false, error: 'Invalid month or year' }, { status: 400 })
        }

        // Get student info
        const studentInfoResult = await db.query(`
            SELECT a.username, sd.grade_level,
                (
                    SELECT string_agg(DISTINCT s.name, ', ' ORDER BY s.name)
                    FROM enrollment_data e
                    INNER JOIN section s ON e.section = s.id
                    INNER JOIN course c ON s.course = c.id
                    WHERE e.student = a.id
                      AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                ) as section
            FROM account a
            LEFT JOIN student_data sd ON sd.student = a.id
            WHERE a.id = $1
        `, [user.id])

        if (studentInfoResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
        }

        const studentInfo = studentInfoResult.rows[0]

        // Get enrolled sections for the active school year
        const coursesResult = await db.query(`
            SELECT s.id, c.name, s.name as section_name
            FROM enrollment_data e
            INNER JOIN section s ON e.section = s.id
            INNER JOIN course c ON s.course = c.id
            WHERE e.student = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
            ORDER BY c.name ASC, s.name ASC
        `, [user.id])

        const enrolledCourses = coursesResult.rows

        if (enrolledCourses.length === 0) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']
            return NextResponse.json({
                success: true,
                data: {
                    studentName: studentInfo.username,
                    gradeLevel: studentInfo.grade_level || 'N/A',
                    section: studentInfo.section || 'N/A',
                    month: monthNames[month - 1],
                    monthNum: month,
                    year,
                    schoolDays: [],
                    totalSchoolDays: 0,
                    courses: [],
                    detectionLog: []
                }
            })
        }

        // Build date range
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        const courseIds = enrolledCourses.map(c => c.id)

        // Get all attendance records for this student across enrolled courses for this month
        // Best record per course per day (deduplication)
        const recordsResult = await db.query(`
            SELECT
                r.course,
                DATE(r.time) as record_date,
                r.attendance,
                r.confidence
            FROM record r
            WHERE r.student = $1
              AND r.course = ANY($2::uuid[])
              AND r.time IS NOT NULL
              AND DATE(r.time) >= $3
              AND DATE(r.time) <= $4
            ORDER BY r.course, DATE(r.time),
                CASE r.attendance WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 0 THEN 3 ELSE 4 END ASC
        `, [user.id, courseIds, startDate, endDate])

        // Build lookup: courseId -> { day -> bestAttendance }
        const attendanceMap: Record<string, Record<number, number>> = {}
        const confidenceMap: Record<string, number[]> = {}

        for (const row of recordsResult.rows) {
            const cId = row.course
            const day = new Date(row.record_date).getDate()

            if (!attendanceMap[cId]) attendanceMap[cId] = {}

            // Only keep first (best) record per course per day
            if (attendanceMap[cId][day] === undefined) {
                attendanceMap[cId][day] = row.attendance
                if ((row.attendance === 1 || row.attendance === 2) && row.confidence != null && row.confidence > 0) {
                    if (!confidenceMap[cId]) confidenceMap[cId] = []
                    confidenceMap[cId].push(row.confidence)
                }
            }
        }

        // Determine school days (all days that had records across any course)
        const schoolDaysSet = new Set<number>()
        for (const courseMap of Object.values(attendanceMap)) {
            for (const day of Object.keys(courseMap)) {
                schoolDaysSet.add(parseInt(day))
            }
        }
        const schoolDays = Array.from(schoolDaysSet).sort((a, b) => a - b)

        // Build per-course results
        const coursesData = enrolledCourses.map(course => {
            const dailyStatus: Record<number, string> = {}
            let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalNoDetection = 0

            for (const day of schoolDays) {
                const att = attendanceMap[course.id]?.[day]
                if (att === 1) { dailyStatus[day] = 'P'; totalPresent++ }
                else if (att === 2) { dailyStatus[day] = 'L'; totalLate++ }
                else if (att === 0) { dailyStatus[day] = 'A'; totalAbsent++ }
                else { dailyStatus[day] = 'ND'; totalNoDetection++ }
            }

            const actualRecords = totalPresent + totalLate + totalAbsent

            const confValues = confidenceMap[course.id] || []
            const avgConfidence = confValues.length > 0
                ? confValues.reduce((a, b) => a + b, 0) / confValues.length
                : null

            return {
                courseId: course.id,
                courseName: course.name,
                dailyStatus,
                totalPresent,
                totalLate,
                totalAbsent,
                totalNoDetection,
                actualRecords,
                avgConfidence,
                totalDetections: confValues.length
            }
        })

        // Detection Log (best record per section per day, chronological)
        const detectionLogResult = await db.query(`
            SELECT * FROM (
                SELECT DISTINCT ON (r.course, DATE(r.time))
                    r.course,
                    c.name as course_name,
                    s.name as section_name,
                    r.time,
                    r.attendance,
                    r.confidence
                FROM record r
                INNER JOIN section s ON r.course = s.id
                INNER JOIN course c ON s.course = c.id
                WHERE r.student = $1
                  AND r.course = ANY($2::uuid[])
                  AND r.time IS NOT NULL
                  AND DATE(r.time) >= $3
                  AND DATE(r.time) <= $4
                ORDER BY r.course, DATE(r.time),
                    CASE r.attendance WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 0 THEN 3 ELSE 4 END ASC
            ) sub
            ORDER BY sub.time ASC, sub.course_name ASC
        `, [user.id, courseIds, startDate, endDate])

        const detectionLog = detectionLogResult.rows.map(row => {
            let status = 'Absent'
            if (row.attendance === 1) status = 'Present'
            else if (row.attendance === 2) status = 'Late'

            return {
                courseName: row.course_name,
                date: row.time ? new Date(row.time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
                time: row.time ? new Date(row.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '-',
                status,
                confidence: row.confidence != null ? row.confidence : null
            }
        })

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December']

        return NextResponse.json({
            success: true,
            data: {
                studentName: studentInfo.username,
                gradeLevel: studentInfo.grade_level || 'N/A',
                section: studentInfo.section || 'N/A',
                month: monthNames[month - 1],
                monthNum: month,
                year,
                totalCourses: enrolledCourses.length,
                schoolDays,
                totalSchoolDays: schoolDays.length,
                courses: coursesData,
                detectionLog
            }
        })
    } catch (error) {
        console.error('Error generating student SF2 data:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate attendance data'
        }, { status: 500 })
    }
}
