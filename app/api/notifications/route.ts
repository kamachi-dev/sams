import { NextRequest, NextResponse } from "next/server";
import pool from "@/app/services/database";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Fetch unread notifications first, then read ones
    const result = await pool.query(
      `SELECT 
        n.id,
        n.student_id,
        n.course_id,
        n.record_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.created_at,
        c.name as course_name
      FROM notification n
      LEFT JOIN section c ON n.course_id = c.id
      WHERE n.student_id = $1
      ORDER BY n.is_read ASC, n.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM notification WHERE student_id = $1",
      [userId]
    );

    return NextResponse.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      unread: result.rows.filter(n => !n.is_read).length,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function POST(req: NextRequest) {
  try {
    const { notificationId } = await req.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE notification SET is_read = true WHERE id = $1",
      [notificationId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
