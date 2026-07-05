import { buildNotificationEmail } from "./buildEmail";
import { claimNotificationDelivery } from "./idempotency";
import { recordFeedEntries } from "./notificationFeed";
import { resolveNotificationRecipients } from "./recipients";

const trimEnv = (value) => value?.trim().replace(/^["']|["']$/g, "") || "";

const getResendClient = async () => {
  const apiKey = trimEnv(process.env.RESEND_API_KEY);
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  if (!apiKey.startsWith("re_")) {
    throw new Error("RESEND_API_KEY format is invalid (must start with re_)");
  }

  const { Resend } = await import("resend");
  return new Resend(apiKey);
};

export function getNotificationEnvStatus() {
  const apiKey = trimEnv(process.env.RESEND_API_KEY);
  const hasServiceAccountJson = Boolean(trimEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));

  return {
    resendApiKey: Boolean(apiKey),
    resendApiKeyFormatOk: apiKey.startsWith("re_"),
    resendFromEmail: Boolean(trimEnv(process.env.RESEND_FROM_EMAIL)),
    webhookSecret: Boolean(trimEnv(process.env.NOTIFICATION_WEBHOOK_SECRET)),
    firebaseAdmin: hasServiceAccountJson || Boolean(
      trimEnv(process.env.FIREBASE_CLIENT_EMAIL) && process.env.FIREBASE_PRIVATE_KEY
    ),
    firebaseAdminMode: hasServiceAccountJson ? "service_account_json" : "split_credentials",
    appUrl: Boolean(trimEnv(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)),
  };
}

export async function dispatchNotification(payload) {
  const from = trimEnv(process.env.RESEND_FROM_EMAIL);
  if (!from) throw new Error("RESEND_FROM_EMAIL is not configured");

  const { boardId, eventType, idempotencyKey } = payload;
  if (!boardId || !eventType || !idempotencyKey) {
    throw new Error("boardId, eventType and idempotencyKey are required");
  }

  const claim = await claimNotificationDelivery(boardId, idempotencyKey, {
    eventType,
    boardId,
    tareaId: payload.tareaId || null,
    recipientEmail: payload.recipientEmail || null,
    actorName: payload.actorName || payload.completedBy || null,
    actorEmail: payload.actorEmail || null,
    messageFragment: buildFeedFragment(payload),
    boardTitle: payload.boardTitle || null,
    itemTitle: payload.itemTitle || null,
  });

  if (!claim.claimed) {
    if (eventType === "mention") {
      console.info("mention_dispatch_duplicate", { idempotencyKey, boardId });
    }
    return { ok: true, skipped: true, duplicate: true, idempotencyKey };
  }

  const recipients = resolveNotificationRecipients(payload);
  if (recipients.length === 0) {
    if (eventType === "mention") {
      console.warn("mention_dispatch_no_recipients", {
        idempotencyKey,
        recipientEmail: payload.recipientEmail,
        actorEmail: payload.actorEmail,
      });
    }
    throw new Error("No recipients to notify");
  }

  const appUrl = trimEnv(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL);
  const boardUrl = boardId && appUrl ? `${appUrl.replace(/\/$/, "")}/b/${boardId}` : "";
  const emailPayload = { ...payload, boardUrl };
  const { subject, html, text } = buildNotificationEmail(emailPayload);

  const resend = await getResendClient();
  const results = await Promise.all(
    recipients.map(async (to) => {
      const { data, error } = await resend.emails.send({ from, to, subject, html, text });
      if (error) {
        throw new Error(`Resend failed for ${to}: ${error.message || JSON.stringify(error)}`);
      }
      return { to, id: data?.id };
    })
  );

  if (eventType === "mention") {
    console.info("mention_dispatch_sent", {
      idempotencyKey,
      recipientEmail: payload.recipientEmail,
      recipientUid: payload.recipientUid || null,
      sent: results.length,
    });
  }

  try {
    await recordFeedEntries(recipients, payload);
  } catch (error) {
    console.error("notification_feed_write_error:", error.message);
  }

  return { ok: true, skipped: false, sent: results.length, results, idempotencyKey };
}

// Legacy alias
export const sendTaskCompletedNotifications = dispatchNotification;
