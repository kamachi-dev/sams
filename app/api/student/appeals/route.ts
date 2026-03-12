export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'
import { notifyTeacherAppeal } from '@/lib/notification-triggers'

/**
 * GET: Fetch all appeals filed by the current student
 * Returns: List of appeals with status, reason, teacher response
 */
export async function GET() {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Not authenticated'
            }, { status: 401 })
        }

        const result = await db.query(`
            SELECT
                aa.id,
                aa.record_id,
                aa.student_reason as reason,
                aa.status,
                aa.created_at as submitted_at,
                aa.reviewed_at,
                aa.teacher_response,
                aa.reviewed_by,
                r.time as record_time,
                r.attendance,
                c.name as course_name,
                s.name as section_name,
                COALESCE(a.username, '') as reviewer_name
            FROM attendance_appeal aa
            LEFT JOIN record r ON aa.record_id = r.id
            LEFT JOIN section s ON aa.course_id = s.id
            LEFT JOIN course c ON s.course = c.id
            LEFT JOIN account a ON aa.reviewed_by = a.id
            WHERE aa.student_id = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
            ORDER BY aa.created_at DESC
        `, [user.id])

        const appeals = result.rows.map(row => {
            let recordedStatus = 'Absent'
            if (row.attendance === 1) recordedStatus = 'Present'
            else if (row.attendance === 2) recordedStatus = 'Late'

            return {
                id: row.id,
                date: row.record_time
                    ? new Date(row.record_time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '-',
                course: row.course_name,
                recordedStatus,
                requestedStatus: 'Present',
                reason: row.reason,
                status: row.status === 0 ? 'pending' : row.status === 1 ? 'approved' : 'rejected',
                submittedAt: row.submitted_at
                    ? new Date(row.submitted_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '-',
                reviewedBy: row.reviewer_name || null,
                teacherResponse: row.teacher_response || null
            }
        })

        return NextResponse.json({
            success: true,
            data: appeals
        })
    } catch (error) {
        console.error('Error fetching student appeals:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch appeals'
        }, { status: 500 })
    }
}

/**
 * POST: Create a new appeal for a specific attendance record
 * Body: { record_id: number, student_reason: string }
 * Returns: Created appeal object
 */
export async function POST(request: Request) {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Not authenticated'
            }, { status: 401 })
        }

        const body = await request.json()
        const { record_id, student_reason } = body

        if (!record_id || !student_reason) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: record_id, student_reason'
            }, { status: 400 })
        }

        // Verify the student owns this record
        const recordCheck = await db.query(`
            SELECT r.id, r.student, r.course, r.attendance, r.time,
                   s.id as section_id, c.id as course_id, c.name as course_name
            FROM record r
            INNER JOIN section s ON r.course = s.id
            INNER JOIN course c ON s.course = c.id
            WHERE r.id = $1 AND r.student = $2
        `, [record_id, user.id])

        if (recordCheck.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Record not found or not owned by student'
            }, { status: 404 })
        }

        const record = recordCheck.rows[0]

        // Check if record is appealable (LATE or ABSENT)
        if (record.attendance === 1) {
            return NextResponse.json({
                success: false,
                error: 'Cannot appeal Present records'
            }, { status: 400 })
        }

        // Enforce same-day appeal window
        const recordDate = new Date(record.time)
        const now = new Date()
        const isSameDay = recordDate.getFullYear() === now.getFullYear()
            && recordDate.getMonth() === now.getMonth()
            && recordDate.getDate() === now.getDate()

        if (!isSameDay) {
            return NextResponse.json({
                success: false,
                error: 'Appeals can only be submitted on the same day as the attendance record'
            }, { status: 400 })
        }

        // Check if appeal already exists for this record
        const existingAppeal = await db.query(`
            SELECT id FROM attendance_appeal
            WHERE record_id = $1
        `, [record_id])

        if (existingAppeal.rows.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Appeal already exists for this record'
            }, { status: 400 })
        }

        // Create the appeal
        const result = await db.query(`
            INSERT INTO attendance_appeal (
                record_id,
                student_id,
                course_id,
                student_reason,
                status
            ) VALUES ($1, $2, $3, $4, 0)
            RETURNING id, record_id, student_reason as reason, status, created_at as submitted_at
        `, [record_id, user.id, record.course_id, student_reason])

        if (result.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Failed to create appeal'
            }, { status: 500 })
        }

        const appeal = result.rows[0]
        const recordedStatus = record.attendance === 2 ? 'Late' : 'Absent'

        // 🚀 TRIGGER NOTIFICATION TO TEACHER
        await notifyTeacherAppeal(
          record.course_id,
          'New Student Appeal',
          `A student submitted an appeal for their ${recordedStatus} attendance.`,
          {
            appealId: appeal.id,
            studentId: user.id,
            courseId: record.course_id,
            recordDate: record.time,
            reason: student_reason,
            type: 'new_appeal',
            url: '/teacher-portal'
          }
        );

        return NextResponse.json({
            success: true,
            data: {
                id: appeal.id,
                date: new Date(record.time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                course: record.course_name,
                recordedStatus,
                requestedStatus: 'Present',
                reason: appeal.reason,
                status: 'pending',
                submittedAt: new Date(appeal.submitted_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                reviewedBy: null,
                teacherResponse: null
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating student appeal:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create appeal'
        }, { status: 500 })
    }
}
