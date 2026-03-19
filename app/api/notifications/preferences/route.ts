import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import db from '@/app/services/database';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        status: 401,
        error: 'Not authenticated'
      });
    }

    const result = await db.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [user.id]
    );

    const preferences = result.rows[0] || {
      user_id: user.id,
      push_enabled: true,
      email_enabled: true,
      new_notification: true,
      attendance_alert: true,
      appeal_status: true,
      daily_summary: false
    };

    return NextResponse.json({
      success: true,
      status: 200,
      data: preferences
    });
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({
      success: false,
      status: 500,
      error: error.message
    });
  }
}

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

    const preferences = await req.json();

    const result = await db.query(
      `INSERT INTO notification_preferences 
        (user_id, push_enabled, email_enabled, new_notification, attendance_alert, appeal_status, daily_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
        push_enabled = $2,
        email_enabled = $3,
        new_notification = $4,
        attendance_alert = $5,
        appeal_status = $6,
        daily_summary = $7
       RETURNING *`,
      [
        user.id,
        preferences.push_enabled ?? true,
        preferences.email_enabled ?? true,
        preferences.new_notification ?? true,
        preferences.attendance_alert ?? true,
        preferences.appeal_status ?? true,
        preferences.daily_summary ?? false
      ]
    );

    return NextResponse.json({
      success: true,
      status: 200,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error saving notification preferences:', error);
    return NextResponse.json({
      success: false,
      status: 500,
      error: error.message
    });
  }
}
