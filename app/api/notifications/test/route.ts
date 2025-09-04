import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/actions/notification-actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, data } = body;

    const notification = await createNotification({
      business_id: "", // Will be set by the function
      type: type || "system_alert",
      title: title || "Test Notification",
      message: message || "This is a test notification",
      data: data || {},
      priority: "normal",
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Error creating test notification:", error);
    return NextResponse.json(
      { error: "Failed to create test notification" },
      { status: 500 }
    );
  }
}
