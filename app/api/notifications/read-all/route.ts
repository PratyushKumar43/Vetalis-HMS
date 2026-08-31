/**
 * API Route: Mark All Notifications as Read
 * 
 * PATCH /api/notifications/read-all
 * 
 * Marks all user's notifications as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { sql } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mark all notifications as read
    await sql`
      UPDATE notifications
      SET read = true
      WHERE user_id = ${user.id}::uuid AND read = false
    `;

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}

