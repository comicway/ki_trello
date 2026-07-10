import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebaseAdmin";
import { assertBoardMember } from "@/lib/notifications/loadNotificationContext";
import {
  dispatchNotification,
  getNotificationEnvStatus,
} from "@/lib/notifications/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const mapLegacyPayload = (body) => {
  if (body.eventType && body.idempotencyKey) return body;

  const itemType = body.itemType || "tarea";
  const eventType = itemType === "subtask" ? "subtask_completed" : "task_completed";
  const idempotencyKey =
    body.idempotencyKey ||
    `${eventType}:${body.tareaId}:${body.subtaskId || "tarea"}:${body.completedAt || "legacy"}`;

  return {
    ...body,
    eventType,
    idempotencyKey,
  };
};

export async function GET() {
  return NextResponse.json({ ok: true, env: getNotificationEnvStatus() });
}

export async function POST(request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let payload = mapLegacyPayload(body);

    if (!isWebhookAuthorized(token)) {
      const decoded = await verifyFirebaseIdToken(token);
      await assertBoardMember(payload.boardId, decoded.email);
    }

    const result = await dispatchNotification(payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error("notification dispatch error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    const status =
      error.message === "Forbidden" ? 403 :
      error.message?.includes("not configured") ? 503 :
      500;

    return NextResponse.json(
      { error: error.message || "Notification failed" },
      { status }
    );
  }
}
