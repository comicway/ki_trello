import { Resend } from "resend";
import { buildTaskCompletedEmail } from "./buildTaskCompletedEmail";

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(apiKey);
};

const resolveAssigneeLabel = (members, assigneeEmail) => {
  if (!assigneeEmail) return "Sin asignar";
  const member = members?.find((m) => m.email === assigneeEmail);
  return member?.displayName || assigneeEmail;
};

export async function sendTaskCompletedNotifications(payload) {
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
    memberEmails = [],
  } = payload;

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not configured");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
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

  const recipients = [...new Set(memberEmails.filter(Boolean))];
  if (recipients.length === 0) {
    console.warn("sendTaskCompletedNotifications: no recipients");
    return { sent: 0 };
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
    text,
  });

  if (error) throw new Error(error.message || "Resend send failed");
  return { sent: recipients.length };
}
