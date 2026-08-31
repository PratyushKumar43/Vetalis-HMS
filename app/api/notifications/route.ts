/**
 * API Route: Notifications
 * 
 * GET /api/notifications - Get user's notifications
 * POST /api/notifications - Create a notification (admin/system only)
 * PATCH /api/notifications/[id]/read - Mark notification as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    let notifications;

    if (unreadOnly) {
      notifications = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${user.id}::uuid AND read = false
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      notifications = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${user.id}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    // Count unread notifications
    const unreadCount = await sql`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${user.id}::uuid AND read = false
    `;

    return NextResponse.json({
      success: true,
      notifications: notifications,
      unreadCount: parseInt(unreadCount[0]?.count || "0"),
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, type, title, message, link } = body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type, title, message" },
        { status: 400 }
      );
    }

    // Only admins and system can create notifications for other users
    // Regular users can only create notifications for themselves
    const userRole = (user.role as string) || "patient";
    if (userId !== user.id && userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create notifications for other users" },
        { status: 403 }
      );
    }

    // Create notification
    const notification = await sql`
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (${userId}::uuid, ${type}, ${title}, ${message}, ${link || null}, NOW())
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      notification: notification[0],
    });
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

