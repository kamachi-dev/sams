export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'
import { createNotificationWithPush } from '@/lib/createAndNotify'
import { sendAppealDecisionEmail, sendParentAppealDecisionEmail } from '@/lib/email-notifications'

/**
 * PATCH: Review an appeal (approve/reject with teacher response)
 * Body: { decision: "approved" | "rejected", teacherResponse: string }
 * Returns: Updated appeal object
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ appealId: string }> }
) {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Not authenticated'
            }, { status: 401 })
        }

        const { appealId } = await params
        const body = await request.json()
        const { decision, teacherResponse } = body

        if (!decision || !['approved', 'rejected'].includes(decision)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid decision. Must be "approved" or "rejected"'
            }, { status: 400 })
        }

        // Verify appeal exists and teacher owns the course
        const appealCheck = await db.query(`
            SELECT aa.id, aa.status, aa.course_id, aa.created_at, s.teacher, c.name as course_name
            FROM attendance_appeal aa
            LEFT JOIN section s ON aa.course_id = s.id
            LEFT JOIN course c ON s.course = c.id
                        WHERE aa.id = $1
                            AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
        `, [appealId])

        if (appealCheck.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Appeal not found'
            }, { status: 404 })
        }

        const appeal = appealCheck.rows[0]

        // Verify teacher owns this course
        if (appeal.teacher !== user.id) {
            return NextResponse.json({
                success: false,
                error: 'Not authorized to review this appeal'
            }, { status: 403 })
        }

        // Check if appeal is already decided
        if (appeal.status !== 0) {
            return NextResponse.json({
                success: false,
                error: 'Appeal has already been reviewed'
            }, { status: 400 })
        }

        // Check if appeal is still within the same-day review window
        const appealDate = new Date(appeal.created_at)
        const now = new Date()
        const isSameDay = appealDate.getFullYear() === now.getFullYear()
            && appealDate.getMonth() === now.getMonth()
            && appealDate.getDate() === now.getDate()

        if (!isSameDay) {
            // Auto-reject since review window has expired
            await db.query(`
                UPDATE attendance_appeal
                SET
                    status = 2,
                    teacher_response = 'Auto-rejected: The appeal review period has expired.',
                    reviewed_by = $1,
                    reviewed_at = NOW()
                WHERE id = $2
            `, [user.id, appealId])

            return NextResponse.json({
                success: false,
                error: 'The appeal review period has expired (only available within the same day). Appeal has been auto-rejected.'
            }, { status: 400 })
        }

        // Update the appeal
        const statusCode = decision === 'approved' ? 1 : 2
        const result = await db.query(`
            UPDATE attendance_appeal
            SET
                status = $1,
                teacher_response = $2,
                reviewed_by = $3,
                reviewed_at = NOW()
            WHERE id = $4
            RETURNING id, record_id, course_id, student_reason as reason, status, created_at as submitted_at, reviewed_at, teacher_response, reviewed_by
        `, [statusCode, teacherResponse || null, user.id, appealId])

        if (result.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Failed to update appeal'
            }, { status: 500 })
        }

        const updatedAppeal = result.rows[0]

        // Query to get student_id and record details for notification
        const studentInfo = await db.query(`
            SELECT aa.student_id, aa.course_id, r.attendance as original_attendance,
                   a.username as student_name
            FROM attendance_appeal aa
            LEFT JOIN record r ON aa.record_id = r.id
            LEFT JOIN account a ON aa.student_id = a.id
            WHERE aa.id = $1
        `, [appealId]);

        // 🚀 NOTIFY STUDENT ABOUT APPEAL DECISION
        if (studentInfo.rows.length > 0) {
            const studentId = studentInfo.rows[0].student_id;
            const studentName = studentInfo.rows[0].student_name || 'Your child';
            const originalAttendance = studentInfo.rows[0].original_attendance;
            const originalStatus = originalAttendance === 2 ? 'Late' : 'Absent';
            const finalAttendance = decision === 'approved' ? 'Present' : originalStatus;

            const message = decision === 'approved'
                ? 'Your appeal has been approved! The attendance record has been corrected.'
                : `Your appeal has been rejected. Teacher's response: ${teacherResponse || 'No response provided'}`;

            await createNotificationWithPush({
                studentId,
                courseId: appeal.course_id,
                recordId: updatedAppeal.record_id,
                type: 1, // appeal
                title: `Appeal ${decision === 'approved' ? '✅ Approved' : '❌ Rejected'}`,
                message,
                sendPush: true
            });

            await sendAppealDecisionEmail({
                studentId,
                courseName: appeal.course_name || 'your course',
                decision,
                teacherResponse,
            });

            // 🚀 NOTIFY PARENT WITH FINAL CONFIRMED ATTENDANCE
            const parentResult = await db.query(
                `SELECT parent FROM student_data WHERE student = $1 AND parent IS NOT NULL`,
                [studentId]
            );

            for (const pRow of parentResult.rows) {
                await sendParentAppealDecisionEmail({
                    parentId: pRow.parent,
                    studentName,
                    courseName: appeal.course_name || 'your course',
                    finalAttendance,
                    decision,
                    teacherResponse,
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id: updatedAppeal.id,
                status: decision,
                teacherResponse: updatedAppeal.teacher_response,
                reviewedBy: user.id,
                reviewedAt: updatedAppeal.reviewed_at
            }
        })
    } catch (error) {
        console.error('Error reviewing appeal:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to review appeal'
        }, { status: 500 })
    }
}
