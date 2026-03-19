import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import db from '@/app/services/database';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        status: 401,
        error: 'Not authenticated'
      });
    }

    const subscription = await req.json();

    // Check if subscription already exists
    const existing = await db.query(
      `SELECT * FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [user.id, subscription.endpoint]
    );

    if (existing.rows.length > 0) {
      // Update existing subscription
      await db.query(
        `UPDATE push_subscriptions 
         SET auth = $1, p256dh = $2, updated_at = NOW()
         WHERE user_id = $3 AND endpoint = $4`,
        [
          subscription.keys.auth,
          subscription.keys.p256dh,
          user.id,
          subscription.endpoint
        ]
      );
    } else {
      // Create new subscription
      await db.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, auth, p256dh)
         VALUES ($1, $2, $3, $4)`,
        [
          user.id,
          subscription.endpoint,
          subscription.keys.auth,
          subscription.keys.p256dh
        ]
      );
    }

    return NextResponse.json({
      success: true,
      status: 200,
      message: 'Subscription saved'
    });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({
      success: false,
      status: 500,
      error: error.message
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        status: 401,
        error: 'Not authenticated'
      });
    }

    const { endpoint } = await req.json();

    await db.query(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [user.id, endpoint]
    );

    return NextResponse.json({
      success: true,
      status: 200,
      message: 'Subscription removed'
    });
  } catch (error: any) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({
      success: false,
      status: 500,
      error: error.message
    });
  }
}
