/**
 * Unified notification creation with automatic push notification sending
 * This function handles both database insertion AND browser push notifications
 */

import pool from "@/app/services/database";
import { sendBulkPushNotifications } from "./push-notifications";

export interface CreateNotificationOptions {
  studentId: string;
  courseId: string;
  recordId?: number | null;
  type: number; // 0=attendance, 1=appeal, 2=announcement, 3=alert
  title: string;
  message: string;
  sendPush?: boolean; // Whether to send browser push, default true
}

export async function createNotificationWithPush(
  options: CreateNotificationOptions
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const {
    studentId,
    courseId,
    recordId,
    type,
    title,
    message,
    sendPush = true,
  } = options;

  try {
    // 1️⃣ Create notification in database
    console.log(`\n🔔 Creating notification: "${title}"`);
    console.log(`   For: ${studentId} | Course: ${courseId} | Type: ${type}`);
    
    const insertResult = await pool.query(
      `INSERT INTO notification 
        (student_id, course_id, record_id, type, title, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [studentId, courseId, recordId || null, type, title, message]
    );

    const notificationId = insertResult.rows[0]?.id;

    if (!notificationId) {
      throw new Error("Failed to create notification record");
    }

    console.log(`✅ Notification saved to DB: ${notificationId}`);

    // 2️⃣ Send browser push notification (if enabled and user has subscriptions)
    if (sendPush) {
      try {
        // Get user's push subscriptions
        const subscriptions = await pool.query(
          `SELECT endpoint, auth, p256dh FROM push_subscriptions 
           WHERE user_id = $1 AND active = true`,
          [studentId]
        );

        console.log(`🔍 Found ${subscriptions.rows.length} active push subscription(s) for ${studentId}`);

        if (subscriptions.rows.length > 0) {
          // Format subscription objects for web-push library
          const formattedSubscriptions = subscriptions.rows.map((sub: any) => ({
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          }));

          // Send push notifications
          console.log(`📤 Sending push notification: "${title}"`);
          const pushResult = await sendBulkPushNotifications(
            formattedSubscriptions,
            title,
            {
              body: message,
              icon: "/images/mmcl-logo.png",
              badge: "/icons/badge.png",
              tag: `notification-${notificationId}`,
              data: {
                type,
                notificationId,
                title,
                message,
              },
            }
          );
          console.log(`✅ Push sent: ${pushResult.sent} success, ${pushResult.failed} failed`);
        } else {
          console.log(`⚠️  No push subscriptions found for ${studentId} - user may not have browser notifications enabled`);
        }
      } catch (pushError) {
        console.warn(`❌ Push notification sending failed (non-critical):`, pushError);
        // Don't fail the whole operation if push fails
        // DB notification was successfully created
      }
    } else {
      console.log(`⏭️  Push notification skipped (sendPush=false)`);
    }

    return {
      success: true,
      notificationId,
    };
  } catch (err) {
    console.error("Error creating notification:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Convenience function for attendance notifications
 */
export async function notifyAttendanceChange(
  studentId: string,
  courseId: string,
  recordId: number,
  status: "present" | "late" | "absent",
  courseName: string
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const statusMap = {
    present: { type: 0, title: "Attendance Marked - Present" },
    late: { type: 0, title: "Attendance Marked - Late" },
    absent: { type: 0, title: "Attendance Marked - Absent" },
  };

  const { type, title } = statusMap[status];
  const message = `Your ${status} status has been recorded for ${courseName}`;

  return createNotificationWithPush({
    studentId,
    courseId,
    recordId,
    type,
    title,
    message,
  });
}

/**
 * Convenience function for appeal notifications
 */
export async function notifyAppealResponse(
  studentId: string,
  courseId: string,
  appealId: number,
  teacherResponse: string,
  courseName: string
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return createNotificationWithPush({
    studentId,
    courseId,
    recordId: appealId,
    type: 1, // Appeal type
    title: "Appeal Status Updated",
    message: `Your appeal for ${courseName} has been reviewed. Response: ${teacherResponse.substring(0, 100)}...`,
  });
}

/**
 * Convenience function for announcement notifications
 */
export async function notifyAnnouncement(
  studentId: string,
  courseId: string,
  title: string,
  message: string
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return createNotificationWithPush({
    studentId,
    courseId,
    type: 2, // Announcement type
    title,
    message,
  });
}

/**
 * Convenience function for alert notifications
 */
export async function notifyAlert(
  studentId: string,
  courseId: string,
  title: string,
  message: string,
  recordId?: number
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return createNotificationWithPush({
    studentId,
    courseId,
    recordId,
    type: 3, // Alert type
    title,
    message,
  });
}

/**
 * Notify all students in a course
 */
export async function notifyCourseAnnouncement(
  courseId: string,
  title: string,
  message: string
): Promise<{ notified: number; failed: number }> {
  let students: any;
  
  try {
    // Get all enrolled students
    students = await pool.query(
      `SELECT DISTINCT e.student FROM enrollment_data e 
       WHERE e.section IN (SELECT id FROM section WHERE course = $1)`,
      [courseId]
    );

    let notified = 0;
    let failed = 0;

    for (const row of students.rows) {
      const result = await createNotificationWithPush({
        studentId: row.student,
        courseId,
        type: 2,
        title,
        message,
      });

      if (result.success) {
        notified++;
      } else {
        failed++;
      }
    }

    return { notified, failed };
  } catch (err) {
    console.error("Error notifying course:", err);
    return { notified: 0, failed: students?.rows?.length || 0 };
  }
}
