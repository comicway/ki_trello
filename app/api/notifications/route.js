import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebaseAdmin";
import { listUserNotifications } from "@/lib/notifications/notificationFeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBearerToken = (request) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
};

export async function GET(request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(token);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 50);

    const notifications = await listUserNotifications(decoded.email, decoded.uid, limit);

    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    console.error("notifications list error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to load notifications" },
      { status: 500 }
    );
  }
}
