import { NextResponse } from 'next/server';
import db from '@/app/services/database';
import { sendBulkPushNotifications } from '@/lib/push-notifications';

export async function POST(req: Request) {
  try {
    const { type, userId, title, message, data } = await req.json();

    // Validate request
    if (!type || !title) {
      return NextResponse.json({
        success: false,
        status: 400,
        error: 'Missing required fields: type, title'
      });
    }

    let targetUserIds: string[] = [];
    let targetUsers = [];

    // Determine who should receive the notification
    switch (type) {
      case 'student_notification':
        // Send to specific student
        targetUserIds = [userId];
        break;

      case 'parent_notification':
        // Get the student and send to their parents
        if (userId) {
          const studentResult = await db.query(
            `SELECT parent_id FROM student_parent WHERE student_id = $1`,
            [userId]
          );
          targetUserIds = studentResult.rows.map((row: any) => row.parent_id);
        }
        break;

      case 'teacher_appeal':
        // Send to teacher when student makes an appeal
        if (data?.courseId) {
          const teacherResult = await db.query(
            `SELECT user_id FROM course_teacher WHERE course_id = $1 LIMIT 1`,
            [data.courseId]
          );
          if (teacherResult.rows.length > 0) {
            targetUserIds = [teacherResult.rows[0].user_id];
          }
        }
        break;

      case 'attendance_alert':
        // Send to student and parents about low attendance
        if (userId) {
          targetUserIds = [userId];
          const parentResult = await db.query(
            `SELECT parent_id FROM student_parent WHERE student_id = $1`,
            [userId]
          );
          targetUserIds.push(...parentResult.rows.map((row: any) => row.parent_id));
        }
        break;

      default:
        return NextResponse.json({
          success: false,
          status: 400,
          error: 'Invalid notification type'
        });
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        status: 200,
        message: 'No target users for this notification'
      });
    }

    // Get push subscriptions for all target users
    const subscripResult = await db.query(
      `SELECT ps.* FROM push_subscriptions ps
       JOIN notification_preferences np ON ps.user_id = np.user_id
       WHERE ps.user_id = ANY($1) 
       AND np.push_enabled = true`,
      [targetUserIds]
    );

    if (subscripResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        status: 200,
        message: 'No active push subscriptions'
      });
    }

    // Convert database subscriptions to web push format
    const subscriptions = subscripResult.rows.map((row: any) => ({
      endpoint: row.endpoint,
      keys: {
        auth: row.auth,
        p256dh: row.p256dh
      }
    }));

    // Send push notifications
    const result = await sendBulkPushNotifications(subscriptions, title, {
      body: message,
      icon: '/icons/notification-icon.png',
      badge: '/icons/notification-badge.png',
      tag: `notification-${type}`,
      data: data || {}
    });

    // Clean up expired subscriptions
    const expiredCount = result.expired;
    if (expiredCount > 0) {
      // Remove expired subscriptions would happen here
      // For now, this is logged
      console.log(`${expiredCount} expired subscriptions found`);
    }

    return NextResponse.json({
      success: true,
      status: 200,
      data: {
        sent: result.sent,
        failed: result.failed,
        expired: result.expired
      }
    });
  } catch (error: any) {
    console.error('Error triggering push notifications:', error);
    return NextResponse.json({
      success: false,
      status: 500,
      error: error.message
    });
  }
}
