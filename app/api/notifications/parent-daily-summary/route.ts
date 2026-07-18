export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { sendParentDailySummary } from '@/lib/email-notifications'

/**
 * POST: Send daily attendance summary emails to all parents
 * Body (optional): { date?: string } — defaults to yesterday
 * 
 * This endpoint is designed to be called by a scheduled cron job
 * (e.g., Vercel Cron, cron-job.org) at the end of each school day.
 * It gathers all attendance records for the given date, checks
 * appeal outcomes, and sends a consolidated summary to each parent.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}))
        const targetDate = body.date || new Date(Date.now() - 86400000).toISOString().slice(0, 10)

        console.log(`\n📧 ========== PARENT DAILY SUMMARY ==========`)
        console.log(`📅 Date: ${targetDate}`)
        console.log(`==============================================\n`)

        // Get all parents who have children with attendance records on the target date
        const parents = await db.query(`
            SELECT DISTINCT sd.parent, a.username, a.email
            FROM student_data sd
            INNER JOIN account a ON sd.parent = a.id
            INNER JOIN record r ON r.student = sd.student
            WHERE sd.parent IS NOT NULL
              AND DATE(r.time) = $1::date
        `, [targetDate])

        if (parents.rows.length === 0) {
            console.log(`⚠️  No parents found with records on ${targetDate}`)
            return NextResponse.json({
                success: true,
                message: 'No parents to notify',
                sent: 0,
            })
        }

        let totalSent = 0
        let totalSkipped = 0

        for (const parent of parents.rows) {
            // Get all attendance records for this parent's children on the target date
            const records = await db.query(`
                SELECT
                    a.username as student_name,
                    c.name as course_name,
                    r.time,
                    r.attendance,
                    s.schedule,
                    aa.status as appeal_status
                FROM record r
                INNER JOIN account a ON r.student = a.id
                INNER JOIN student_data sd ON sd.student = a.id
                INNER JOIN section s ON r.course = s.id
                INNER JOIN course c ON s.course = c.id
                LEFT JOIN attendance_appeal aa ON aa.record_id = r.id
                WHERE sd.parent = $1
                  AND DATE(r.time) = $2::date
                  AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                ORDER BY a.username, c.name
            `, [parent.id, targetDate])

            function getClassTime(schedule: unknown, recordTime: string): string | null {
                if (!schedule) return null
                try {
                    const parsed = typeof schedule === 'string' ? JSON.parse(schedule) : schedule
                    if (!parsed || typeof parsed !== 'object') return null
                    const day = new Date(recordTime).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                    const classSchedule = (parsed as Record<string, { start?: string; end?: string }>)[day]
                    if (!classSchedule?.start && !classSchedule?.end) return null
                    return [classSchedule.start, classSchedule.end].filter(Boolean).join(' – ')
                } catch {
                    return null
                }
            }

            const summaryRecords = records.rows.map((r: any) => {
                const originalAttendance = r.attendance === 1 ? 'Present' : r.attendance === 2 ? 'Late' : 'Absent'

                let finalAttendance = originalAttendance
                let appealStatus: string | null = null

                if (r.appeal_status === 1) {
                    finalAttendance = 'Present'
                    appealStatus = 'approved'
                } else if (r.appeal_status === 2) {
                    appealStatus = 'rejected'
                }

                return {
                    studentName: r.student_name,
                    courseName: r.course_name,
                    scheduledTime: getClassTime(r.schedule, r.time),
                    originalAttendance,
                    finalAttendance,
                    appealStatus,
                }
            })

            if (summaryRecords.length > 0) {
                const result = await sendParentDailySummary({
                    parentId: parent.id,
                    date: new Date(targetDate).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                    }),
                    records: summaryRecords,
                })
                totalSent += result.sent
                totalSkipped += result.skipped
            }
        }

        console.log(`\n✅ Parent daily summary complete: ${totalSent} sent, ${totalSkipped} skipped`)

        return NextResponse.json({
            success: true,
            message: `Parent daily summary processed`,
            sent: totalSent,
            skipped: totalSkipped,
            date: targetDate,
        })
    } catch (error) {
        console.error('Error sending parent daily summary:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send parent daily summary',
        }, { status: 500 })
    }
}
