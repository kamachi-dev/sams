export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'
import { notifyStudentNotification } from '@/lib/notification-triggers'

/**
 * PATCH: Review an appeal (approve/reject with teacher response)
 * Body: { decision: "approved" | "rejected", teacherResponse: string }
 * Returns: Updated appeal object
 */
export async function PATCH(
    request: Request,
    { params }: { params: { appealId: string } }
) {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Not authenticated'
            }, { status: 401 })
        }

        const { appealId } = params
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
            SELECT aa.id, aa.status, aa.course_id, s.teacher
            FROM attendance_appeal aa
            LEFT JOIN course c ON aa.course_id = c.id
            LEFT JOIN section s ON c.id = s.course
            WHERE aa.id = $1
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

        // Query to get student_id for notification
        const studentInfo = await db.query(`
            SELECT student_id FROM attendance_appeal WHERE id = $1
        `, [appealId]);

        // 🚀 NOTIFY STUDENT ABOUT APPEAL DECISION
        if (studentInfo.rows.length > 0) {
          const studentId = studentInfo.rows[0].student_id;
          const message = decision === 'approved'
            ? 'Your appeal has been approved! The attendance record has been corrected.'
            : `Your appeal has been rejected. Teacher's response: ${teacherResponse || 'No response provided'}`;

          await notifyStudentNotification(
            studentId,
            `Appeal ${decision === 'approved' ? '✅ Approved' : '❌ Rejected'}`,
            message,
            {
              appealId: updatedAppeal.id,
              decision,
              type: 'appeal_decision',
              url: '/student-portal'
            }
          );
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
