import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import db from '@/app/services/database';
import { sendPushNotification, sendBulkPushNotifications } from '@/lib/push-notifications';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const { childName, present, late, absent, percentage } = await req.json();

    // Get user's push subscriptions
    const subscriptions = await db.query(
      'SELECT endpoint, auth, p256dh FROM push_subscriptions WHERE user_id = $1',
      [user.id]
    );

    if (subscriptions.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions to send to'
      });
    }

    // Format subscription objects
    const formattedSubscriptions = subscriptions.rows.map((sub: any) => ({
      endpoint: sub.endpoint,
      keys: {
        auth: sub.auth,
        p256dh: sub.p256dh
      }
    }));

    // Send push notifications
    const title = `${childName}'s Attendance Updated`;
    const result = await sendBulkPushNotifications(formattedSubscriptions, title, {
      body: `Present: ${present}, Late: ${late}, Absent: ${absent} (${percentage}%)`,
      icon: '/icons/attendance.png',
      badge: '/icons/badge.png',
      tag: `attendance-update`,
      data: {
        type: 'attendance-update',
        childName,
        present,
        late,
        absent,
        percentage
      }
    });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed
    });

  } catch (error) {
    console.error('Error sending attendance update push:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
