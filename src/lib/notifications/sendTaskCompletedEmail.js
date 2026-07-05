import { buildTaskCompletedEmail } from "./buildTaskCompletedEmail";

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

const resolveAssigneeLabel = (members, assigneeEmail) => {
  if (!assigneeEmail) return "Sin asignar";
  const member = members?.find((m) => m.email === assigneeEmail);
  return member?.displayName || assigneeEmail;
};

export const resolveMemberEmails = (payload = {}) => {
  const fromField = payload.memberEmails || [];
  const fromMembers = (payload.members || []).map((m) => m.email).filter(Boolean);
  return [...new Set([...fromField, ...fromMembers].filter(Boolean))];
};

export async function sendTaskCompletedNotifications(payload) {
  const from = trimEnv(process.env.RESEND_FROM_EMAIL);
  if (!from) throw new Error("RESEND_FROM_EMAIL is not configured");

  const {
    boardTitle,
    listTitle,
    itemType,
    itemTitle,
    assigneeEmail,
    completedBy,
    completedAt,
    boardId,
    members = [],
  } = payload;

  const appUrl = trimEnv(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL);
  const boardUrl = boardId && appUrl ? `${appUrl.replace(/\/$/, "")}/b/${boardId}` : "";

  const assigneeLabel = resolveAssigneeLabel(members, assigneeEmail);
  const { subject, html, text } = buildTaskCompletedEmail({
    boardTitle,
    listTitle,
    itemType,
    itemTitle,
    assigneeLabel,
    completedBy,
    completedAt,
    boardUrl,
  });

  const recipients = resolveMemberEmails(payload);
  if (recipients.length === 0) {
    throw new Error("No board members with email to notify");
  }

  const resend = await getResendClient();
  const results = await Promise.all(
    recipients.map(async (to) => {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
      });

      if (error) {
        throw new Error(`Resend failed for ${to}: ${error.message || JSON.stringify(error)}`);
      }

      return { to, id: data?.id };
    })
  );

  return { sent: results.length, results };
}

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
