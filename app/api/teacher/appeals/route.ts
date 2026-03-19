export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET: Fetch all appeals for this teacher's courses
 * Includes both pending appeals and appeal history (approved/rejected)
 * Returns: List of appeals with student info, course, dates, statuses
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

        // Get all appeals where teacher owns the course
        const result = await db.query(`
            SELECT
                aa.id,
                aa.record_id,
                aa.student_id,
                aa.course_id,
                aa.student_reason as reason,
                aa.status,
                aa.created_at as submitted_at,
                aa.reviewed_at,
                aa.teacher_response,
                aa.reviewed_by,
                r.time as record_time,
                r.attendance,
                c.name as course_name,
                c.id as course_id_db,
                s.id as section_id,
                s.name as section_name,
                sd.name as student_name,
                rev.username as reviewer_name
            FROM attendance_appeal aa
            LEFT JOIN record r ON aa.record_id = r.id
            LEFT JOIN course c ON aa.course_id = c.id
            LEFT JOIN section s ON c.id = s.course
            LEFT JOIN student_data sd ON aa.student_id = sd.id
            LEFT JOIN account rev ON aa.reviewed_by = rev.id
            WHERE s.teacher = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
            ORDER BY aa.created_at DESC
        `, [user.id])

        const appeals = result.rows.map(row => {
            let recordedStatus = 'Absent'
            if (row.attendance === 1) recordedStatus = 'Present'
            else if (row.attendance === 2) recordedStatus = 'Late'

            return {
                id: row.id,
                studentName: row.student_name,
                section: row.section_name,
                courseId: row.course_id_db,
                course: row.course_name,
                date: row.record_time
                    ? new Date(row.record_time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '-',
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
        console.error('Error fetching teacher appeals:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch appeals'
        }, { status: 500 })
    }
}
