// EXAMPLE INTEGRATIONS FOR NOTIFICATION TRIGGERS
// These show how to integrate with existing code

// ================================================
// EXAMPLE 1: Student Portal - Appeal Submission
// ================================================
// File: app/api/student/appeals/route.ts

import { NextResponse } from 'next/server';
import db from '@/app/services/database';
import { currentUser } from '@clerk/nextjs/server';
import { notifyTeacherAppeal } from '@/lib/notification-triggers';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { record_id, student_reason } = await req.json();

    // Get the student and course info
    const recordResult = await db.query(
      `SELECT ar.*, c.id as course_id, c.course_name
       FROM attendance_record ar
       JOIN courses c ON ar.course_id = c.id
       WHERE ar.id = $1`,
      [record_id]
    );

    if (recordResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    const record = recordResult.rows[0];

    // Create the appeal
    const appealResult = await db.query(
      `INSERT INTO appeals (student_id, record_id, reason, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING *`,
      [user.id, record_id, student_reason]
    );

    const appealData = appealResult.rows[0];

    // 🚀 TRIGGER NOTIFICATION TO TEACHER
    await notifyTeacherAppeal(
      record.course_id,
      'New Student Appeal',
      `A student submitted an appeal for their ${record.status} attendance.`,
      {
        appealId: appealData.id,
        studentId: user.id,
        courseId: record.course_id,
        recordDate: record.date,
        reason: student_reason,
        type: 'new_appeal',
        url: '/teacher-portal'
      }
    );

    return NextResponse.json({
      success: true,
      status: 200,
      data: appealData
    });
  } catch (error) {
    console.error('Error creating appeal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ================================================
// EXAMPLE 2: Parent Portal - Child Notification
// ================================================
// File: app/api/student/notifications/route.ts

import { NextResponse } from 'next/server';
import db from '@/app/services/database';
import { notifyParentNotification } from '@/lib/notification-triggers';

export async function POST(req: Request) {
  try {
    const { studentId, title, message, type } = await req.json();

    // Create notification in database
    const result = await db.query(
      `INSERT INTO notifications (student_id, title, message, type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [studentId, title, message, type]
    );

    const notification = result.rows[0];

    // 🚀 TRIGGER NOTIFICATION TO PARENTS
    // This function automatically finds all parents of the student
    await notifyParentNotification(
      studentId,
      `Alert: ${title}`,
      message,
      {
        notificationId: notification.id,
        studentId,
        type,
        url: '/parent-portal'
      }
    );

    return NextResponse.json({
      success: true,
      status: 200,
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ================================================
// EXAMPLE 3: Scheduled Job - Daily Attendance Alert
// ================================================
// File: app/api/scheduled/daily-attendance-check/route.ts

import { NextResponse } from 'next/server';
import db from '@/app/services/database';
import { notifyAttendanceAlert } from '@/lib/notification-triggers';

// This would typically be called by a cron job service (Vercel Cron, AWS Lambda, etc.)
export async function GET(req: Request) {
  try {
    // Verify this is a legitimate request (add your auth header check here)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find students with attendance < 75%
    const result = await db.query(
      `SELECT s.id, s.username,
              ROUND(
                CAST(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) AS NUMERIC) /
                COUNT(*) * 100, 2
              ) as attendance_rate
       FROM students s
       LEFT JOIN attendance_records a ON s.id = a.student_id
       GROUP BY s.id
       HAVING COUNT(*) > 0
       AND ROUND(
         CAST(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) AS NUMERIC) /
         COUNT(*) * 100, 2
       ) < 75
       ORDER BY attendance_rate ASC`
    );

    let notified = 0;

    // 🚀 NOTIFY EACH STUDENT WITH LOW ATTENDANCE
    for (const student of result.rows) {
      const success = await notifyAttendanceAlert(
        student.id,
        '⚠️ Attendance Warning',
        `Your current attendance rate is ${student.attendance_rate}%. 
         Please attend classes regularly to meet the 75% minimum requirement.`,
        {
          studentId: student.id,
          attendanceRate: student.attendance_rate,
          type: 'low_attendance',
          url: '/student-portal'
        }
      );

      if (success) notified++;
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${notified} attendance alerts`,
      totalLowAttendance: result.rows.length,
      notified
    });
  } catch (error) {
    console.error('Error in daily attendance check:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ================================================
// EXAMPLE 4: Attendance Detection - Real-time Alert
// ================================================
// File: app/api/camera/attendance/route.ts (existing)

// When recording attendance detection, add this:

import { notifyStudentNotification } from '@/lib/notification-triggers';

export async function POST(req: Request) {
  // ... existing code ...

  // After saving attendance record:
  const record = { /* ... */ };

  if (record.status === 'Late') {
    // 🚀 NOTIFY STUDENT ABOUT LATE ARRIVAL
    await notifyStudentNotification(
      record.student_id,
      'Late Attendance Recorded',
      `You were marked as late for ${record.course_name} at ${record.recorded_time}`,
      {
        recordId: record.id,
        status: 'Late',
        course: record.course_name,
        type: 'late_attendance',
        url: '/student-portal'
      }
    );
  } else if (record.status === 'Absent') {
    // 🚀 NOTIFY STUDENT AND PARENTS ABOUT ABSENCE
    await notifyStudentNotification(
      record.student_id,
      'Absence Recorded',
      `You were marked as absent for ${record.course_name}`,
      { recordId: record.id, type: 'absent' }
    );

    // Also notify parents
    await notifyParentNotification(
      record.student_id,
      'Student Absence Alert',
      `Your child was marked absent for ${record.course_name}`,
      { recordId: record.id, type: 'child_absent' }
    );
  }

  return NextResponse.json({ success: true, data: record });
}

// ================================================
// EXAMPLE 5: Teacher Portal - Appeal Status Update
// ================================================
// File: app/api/teacher/appeals/[appealId]/route.ts (PATCH)

import { notifyStudentNotification } from '@/lib/notification-triggers';

export async function PATCH(req: Request, { params }: { params: { appealId: string } }) {
  try {
    const { decision, teacherResponse } = await req.json();

    // Update appeal status
    const result = await db.query(
      `UPDATE appeals SET status = $1, teacher_response = $2, reviewed_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [decision, teacherResponse, params.appealId]
    );

    const appeal = result.rows[0];

    // 🚀 NOTIFY STUDENT ABOUT APPEAL DECISION
    const message = decision === 'approved'
      ? 'Your appeal has been approved! The attendance record has been corrected.'
      : `Your appeal has been rejected. Teacher's response: ${teacherResponse}`;

    await notifyStudentNotification(
      appeal.student_id,
      `Appeal ${decision === 'approved' ? '✅ Approved' : '❌ Rejected'}`,
      message,
      {
        appealId: appeal.id,
        decision,
        type: 'appeal_decision',
        url: '/student-portal'
      }
    );

    return NextResponse.json({ success: true, data: appeal });
  } catch (error) {
    console.error('Error updating appeal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ================================================
// CONFIGURING CRON JOB FOR SCHEDULED ALERTS
// ================================================

// For Vercel Cron (add to vercel.json or similar):
/*
{
  "crons": [{
    "path": "/api/scheduled/daily-attendance-check",
    "schedule": "0 18 * * *"  // Daily at 6 PM
  }]
}
*/

// For other platforms, set up a cron job that calls:
// curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourapp.com/api/scheduled/daily-attendance-check

// ================================================
// ENVIRONMENT SETUP FOR SCHEDULED JOBS
// ================================================

// Add to .env.local or your host platform:
/*
CRON_SECRET=your_secret_key_for_cron_verification
*/
