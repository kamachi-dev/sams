export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * SF2 API — Returns per-student, per-day attendance data for a given month.
 * Query params:
 *   - course (required): course ID
 *   - section (required): section name
 *   - month (required): 1-12
 *   - year (required): e.g. 2026
 *
 * Returns:
 *   - courseName, section, month, year, schoolName
 *   - schoolDays: array of day-of-month numbers that had records
 *   - students: array of { name, sex, dailyStatus: { [day]: 'P'|'L'|'A' }, 
 *       totalPresent, totalLate, totalAbsent }
 */
export async function GET(req: Request) {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get('course')
        const section = searchParams.get('section')
        const monthStr = searchParams.get('month')
        const yearStr = searchParams.get('year')

        if (!courseId || !monthStr || !yearStr) {
            return NextResponse.json({
                success: false,
                error: 'course, month, and year parameters are required'
            }, { status: 400 })
        }

        const month = parseInt(monthStr)
        const year = parseInt(yearStr)

        if (month < 1 || month > 12 || isNaN(year)) {
            return NextResponse.json({ success: false, error: 'Invalid month or year' }, { status: 400 })
        }

        // Verify teacher owns this section
        const courseCheck = await db.query(
            `SELECT s.id, c.name, s.name as section_name FROM section s INNER JOIN course c ON s.course = c.id WHERE s.id = $1 AND s.teacher = $2 AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [courseId, user.id]
        )

        if (courseCheck.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 })
        }

        const courseName = courseCheck.rows[0].name
        const sectionName = courseCheck.rows[0].section_name

        // Get the teacher's display name
        const teacherResult = await db.query(
            `SELECT username FROM account WHERE id = $1`,
            [user.id]
        )
        const teacherName = teacherResult.rows[0]?.username || 'Unknown'

        // Build date range for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate() // last day of month
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        // Get all enrolled students in this course + section, sorted alphabetically
        const studentsResult = await db.query(`
            SELECT DISTINCT
                a.id,
                a.username as name
            FROM enrollment_data e
            INNER JOIN account a ON e.student = a.id
            WHERE e.section = $1
            ORDER BY a.username ASC
        `, [courseId])

        const students = studentsResult.rows

        // Get all attendance records for these students in this course for this month
        // For each student+day, pick the BEST record: present(1) > late(2) > absent(0)
        const recordsResult = await db.query(`
            SELECT 
                r.student,
                DATE(r.time) as record_date,
                r.attendance,
                r.confidence
            FROM record r
            WHERE r.course = $1
              AND r.time IS NOT NULL
              AND DATE(r.time) >= $2
              AND DATE(r.time) <= $3
              AND r.student = ANY($4::text[])
            ORDER BY r.student, DATE(r.time), 
                CASE r.attendance WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 0 THEN 3 ELSE 4 END ASC
        `, [courseId, startDate, endDate, students.map(s => s.id)])

        // Build a lookup: studentId -> { dayOfMonth -> bestAttendance }
        const attendanceMap: Record<string, Record<number, number>> = {}
        // Build confidence lookup: studentId -> array of confidence values (from detected records only)
        const confidenceMap: Record<string, number[]> = {}
        for (const row of recordsResult.rows) {
            const studentId = row.student
            const day = new Date(row.record_date).getDate()

            if (!attendanceMap[studentId]) {
                attendanceMap[studentId] = {}
            }

            // Only keep the first (best) record per student per day due to ORDER BY
            if (attendanceMap[studentId][day] === undefined) {
                attendanceMap[studentId][day] = row.attendance
                // Track confidence for detected records (present or late, not absent)
                if ((row.attendance === 1 || row.attendance === 2) && row.confidence != null && row.confidence > 0) {
                    if (!confidenceMap[studentId]) confidenceMap[studentId] = []
                    confidenceMap[studentId].push(row.confidence)
                }
            }
        }

        // Determine which days of the month had any records (school days)
        const schoolDaysSet = new Set<number>()
        for (const studentMap of Object.values(attendanceMap)) {
            for (const day of Object.keys(studentMap)) {
                schoolDaysSet.add(parseInt(day))
            }
        }
        const schoolDays = Array.from(schoolDaysSet).sort((a, b) => a - b)

        // Build per-student results
        const studentData = students.map(student => {
            const dailyStatus: Record<number, string> = {}
            let totalPresent = 0
            let totalLate = 0
            let totalAbsent = 0       // only real absent records from DB (attendance=0)
            let totalNoDetection = 0  // no record in DB for this day

            for (const day of schoolDays) {
                const att = attendanceMap[student.id]?.[day]
                if (att === 1) {
                    dailyStatus[day] = 'P'  // Present — ✓
                    totalPresent++
                } else if (att === 2) {
                    dailyStatus[day] = 'L'  // Late
                    totalLate++
                } else if (att === 0) {
                    dailyStatus[day] = 'A'  // Absent — actual DB record
                    totalAbsent++
                } else {
                    // No record exists in DB for this student on this day
                    dailyStatus[day] = 'ND' // No Detection — NOT absent
                    totalNoDetection++
                }
            }

            // actualRecords = only days where a real database record exists (P + L + A)
            const actualRecords = totalPresent + totalLate + totalAbsent

            // Calculate average detection confidence for this student
            const confValues = confidenceMap[student.id] || []
            const avgConfidence = confValues.length > 0
                ? confValues.reduce((a, b) => a + b, 0) / confValues.length
                : null

            return {
                id: student.id,
                name: student.name,
                dailyStatus,
                totalPresent,
                totalLate,
                totalAbsent,       // only real DB absent records
                totalNoDetection,  // days with no record in DB
                actualRecords,     // totalPresent + totalLate + totalAbsent
                totalDays: schoolDays.length,
                avgConfidence, // 0-1 float or null if never detected
                totalDetections: confValues.length
            }
        })

        // Month name
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December']

        // Get best attendance record per student per day (deduplicated) for Detection Log
        const detectionLogResult = await db.query(`
            SELECT * FROM (
                SELECT DISTINCT ON (r.student, DATE(r.time))
                    r.student,
                    a.username as student_name,
                    r.time,
                    r.attendance,
                    r.confidence
                FROM record r
                INNER JOIN account a ON r.student = a.id
                WHERE r.course = $1
                  AND r.time IS NOT NULL
                  AND DATE(r.time) >= $2
                  AND DATE(r.time) <= $3
                  AND r.student = ANY($4::text[])
                ORDER BY r.student, DATE(r.time),
                    CASE r.attendance WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 0 THEN 3 ELSE 4 END ASC
            ) sub
            ORDER BY sub.time ASC, sub.student_name ASC
        `, [courseId, startDate, endDate, students.map(s => s.id)])

        const detectionLog = detectionLogResult.rows.map(row => {
            let status = 'Absent'
            if (row.attendance === 1) status = 'Present'
            else if (row.attendance === 2) status = 'Late'

            return {
                studentName: row.student_name,
                date: row.time ? new Date(row.time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
                time: row.time ? new Date(row.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '-',
                status,
                confidence: row.confidence != null ? row.confidence : null
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                courseName,
                section: sectionName,
                month: monthNames[month - 1],
                monthNum: month,
                year,
                teacherName,
                totalEnrolled: students.length,
                schoolDays,
                totalSchoolDays: schoolDays.length,
                students: studentData,
                detectionLog
            }
        })
    } catch (error) {
        console.error('Error generating SF2 data:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate SF2 data'
        }, { status: 500 })
    }
}
