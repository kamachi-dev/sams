import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import db from '@/app/services/database';
import { sendBulkPushNotifications } from '@/lib/push-notifications';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const { title, message, type, notificationId } = await req.json();

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
    const result = await sendBulkPushNotifications(formattedSubscriptions, title, {
      body: message,
      icon: '/icons/notification.png',
      badge: '/icons/badge.png',
      tag: `notification-${notificationId}`,
      data: {
        type,
        notificationId,
        title,
        message
      }
    });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
