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
        const studentId = searchParams.get('student')
        const courseId = searchParams.get('course')

        if (!studentId || !courseId) {
            return NextResponse.json({
                success: false,
                error: 'Both student and course parameters are required'
            }, { status: 400 })
        }

        // Get individual student's attendance statistics for the specified course
        const studentResult = await db.query(`
            SELECT 
                a.id as student_id,
                a.username as student_name,
                c.name as course_name,
                COUNT(r.id) as total_records,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_count
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            INNER JOIN account a ON e.student = a.id
            LEFT JOIN record r ON r.student = a.id AND r.course = c.id
            WHERE c.teacher = $1 AND a.id = $2 AND c.id = $3
            GROUP BY a.id, a.username, c.name
        `, [user.id, studentId, courseId])

        // Get class-wide attendance statistics for the same course
        const classResult = await db.query(`
            SELECT 
                COUNT(r.id) as total_records,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present_count,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late_count,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent_count,
                COUNT(DISTINCT e.student) as total_students
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            LEFT JOIN record r ON r.student = e.student AND r.course = c.id
            WHERE c.teacher = $1 AND c.id = $2
        `, [user.id, courseId])

        // Get monthly breakdown for both student and class
        const monthlyStudentResult = await db.query(`
            SELECT 
                TO_CHAR(r.time, 'Mon') as month,
                EXTRACT(MONTH FROM r.time) as month_num,
                COUNT(r.id) as total,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
            FROM record r
            INNER JOIN course c ON r.course = c.id
            WHERE c.teacher = $1 AND r.student = $2 AND c.id = $3
            GROUP BY TO_CHAR(r.time, 'Mon'), EXTRACT(MONTH FROM r.time)
            ORDER BY month_num
        `, [user.id, studentId, courseId])

        const monthlyClassResult = await db.query(`
            SELECT 
                TO_CHAR(r.time, 'Mon') as month,
                EXTRACT(MONTH FROM r.time) as month_num,
                COUNT(r.id) as total,
                COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
            FROM record r
            INNER JOIN course c ON r.course = c.id
            WHERE c.teacher = $1 AND c.id = $2
            GROUP BY TO_CHAR(r.time, 'Mon'), EXTRACT(MONTH FROM r.time)
            ORDER BY month_num
        `, [user.id, courseId])

        // Calculate attendance rates - only present counts
        const calculateRate = (present: number, late: number, total: number) => {
            if (total === 0) return 0
            return Math.round((present / total) * 100 * 10) / 10
        }

        const studentData = studentResult.rows[0]
        const classData = classResult.rows[0]

        // Process student statistics
        const studentStats = studentData ? {
            id: studentData.student_id,
            name: studentData.student_name,
            courseName: studentData.course_name,
            totalRecords: parseInt(studentData.total_records || '0'),
            present: parseInt(studentData.present_count || '0'),
            late: parseInt(studentData.late_count || '0'),
            absent: parseInt(studentData.absent_count || '0'),
            attendanceRate: calculateRate(
                parseInt(studentData.present_count || '0'),
                parseInt(studentData.late_count || '0'),
                parseInt(studentData.total_records || '0')
            )
        } : null

        // Process class statistics
        const classStats = {
            totalStudents: parseInt(classData?.total_students || '0'),
            totalRecords: parseInt(classData?.total_records || '0'),
            present: parseInt(classData?.present_count || '0'),
            late: parseInt(classData?.late_count || '0'),
            absent: parseInt(classData?.absent_count || '0'),
            attendanceRate: calculateRate(
                parseInt(classData?.present_count || '0'),
                parseInt(classData?.late_count || '0'),
                parseInt(classData?.total_records || '0')
            )
        }

        // Process monthly trends for comparison chart
        const monthlyComparison = monthlyStudentResult.rows.map(studentMonth => {
            const classMonth = monthlyClassResult.rows.find(
                cm => cm.month_num === studentMonth.month_num
            )
            
            return {
                month: studentMonth.month,
                studentRate: calculateRate(
                    parseInt(studentMonth.present),
                    parseInt(studentMonth.late),
                    parseInt(studentMonth.total)
                ),
                classRate: classMonth ? calculateRate(
                    parseInt(classMonth.present),
                    parseInt(classMonth.late),
                    parseInt(classMonth.total)
                ) : 0
            }
        })

        // If student has no records, use class months
        const finalMonthlyComparison = monthlyComparison.length > 0 
            ? monthlyComparison 
            : monthlyClassResult.rows.map(classMonth => ({
                month: classMonth.month,
                studentRate: 0,
                classRate: calculateRate(
                    parseInt(classMonth.present),
                    parseInt(classMonth.late),
                    parseInt(classMonth.total)
                )
            }))

        return NextResponse.json({ 
            success: true, 
            data: {
                student: studentStats,
                class: classStats,
                monthlyComparison: finalMonthlyComparison,
                comparison: {
                    rateVsClass: studentStats 
                        ? (studentStats.attendanceRate - classStats.attendanceRate).toFixed(1)
                        : null,
                    status: studentStats 
                        ? studentStats.attendanceRate >= classStats.attendanceRate 
                            ? 'above' 
                            : 'below'
                        : 'unknown'
                }
            }
        })
    } catch (error) {
        console.error('Error fetching comparative analytics:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch comparative analytics'
        }, { status: 500 })
    }
}
