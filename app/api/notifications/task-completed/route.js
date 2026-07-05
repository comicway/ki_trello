import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebaseAdmin";
import { loadNotificationContext, assertBoardMember } from "@/lib/notifications/loadNotificationContext";
import {
  getNotificationEnvStatus,
  sendTaskCompletedNotifications,
} from "@/lib/notifications/sendTaskCompletedEmail";

export const runtime = "nodejs";

const trimEnv = (value) => value?.trim().replace(/^["']|["']$/g, "") || "";

const getBearerToken = (request) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
};

const isWebhookAuthorized = (token) => {
  const secret = trimEnv(process.env.NOTIFICATION_WEBHOOK_SECRET);
  return Boolean(secret && token && token === secret);
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: getNotificationEnvStatus(),
  });
}

export async function POST(request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let payload = body;

    if (isWebhookAuthorized(token)) {
      payload = body;
    } else {
      const decoded = await verifyFirebaseIdToken(token);
      await assertBoardMember(body.boardId, decoded.email);

      payload = await loadNotificationContext({
        boardId: body.boardId,
        listId: body.listId,
        tareaId: body.tareaId,
        itemType: body.itemType || "tarea",
        subtaskId: body.subtaskId || null,
      });
    }

    const result = await sendTaskCompletedNotifications(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("task-completed notification error:", error);
    const status = error.message === "Forbidden" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Notification failed" },
      { status }
    );
  }
}
