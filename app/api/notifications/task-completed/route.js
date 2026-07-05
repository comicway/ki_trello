import { NextResponse } from "next/server";
import { sendTaskCompletedNotifications } from "@/lib/notifications/sendTaskCompletedEmail";

export const runtime = "nodejs";

const isAuthorized = (request) => {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
};

export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const result = await sendTaskCompletedNotifications(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("task-completed notification error:", error);
    return NextResponse.json(
      { error: error.message || "Notification failed" },
      { status: 500 }
    );
  }
}
