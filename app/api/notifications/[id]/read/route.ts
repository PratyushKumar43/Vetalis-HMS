/**
 * API Route: Mark Notification as Read
 * 
 * PATCH /api/notifications/[id]/read
 * 
 * Marks a notification as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { sql } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationId = params.id;

    // Verify the notification belongs to the user
    const notification = await sql`
      SELECT id, user_id FROM notifications WHERE id = ${notificationId}::uuid
    `;

    if (notification.length === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (notification[0].user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only mark your own notifications as read" },
        { status: 403 }
      );
    }

    // Mark as read
    await sql`
      UPDATE notifications
      SET read = true
      WHERE id = ${notificationId}::uuid
    `;

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}

