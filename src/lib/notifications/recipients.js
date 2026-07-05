import { ALL_MEMBERS_EVENTS } from "./eventTypes";

export const resolveMemberEmails = (payload = {}) => {
  const fromField = payload.memberEmails || [];
  const fromMembers = (payload.members || []).map((m) => m.email).filter(Boolean);
  return [...new Set([...fromField, ...fromMembers].filter(Boolean))];
};

const normalizeEmail = (email) => email?.toLowerCase?.().trim() || "";

export const resolveMentionRecipients = (payload) => {
  const recipientEmail = payload.recipientEmail;
  const email = normalizeEmail(recipientEmail);
  if (!email) return [];

  const parsedTargets = (payload.parsedTargetEmails?.length
    ? payload.parsedTargetEmails
    : [recipientEmail]
  ).map(normalizeEmail).filter(Boolean);

  if (!parsedTargets.includes(email)) return [];

  const taskAssignee = normalizeEmail(payload.taskAssigneeEmail);
  if (taskAssignee && email === taskAssignee && parsedTargets[0] !== taskAssignee) {
    return [];
  }

  return [recipientEmail];
};

export const resolveNotificationRecipients = (payload) => {
  const { eventType, recipientEmail, actorEmail } = payload;

  if (eventType === "mention") {
    return resolveMentionRecipients(payload);
  }

  if (eventType === "assignee_changed") {
    if (!recipientEmail) return [];
    if (normalizeEmail(recipientEmail) === normalizeEmail(actorEmail)) return [];
    return [recipientEmail];
  }

  if (ALL_MEMBERS_EVENTS.has(eventType)) {
    return resolveMemberEmails(payload);
  }

  return resolveMemberEmails(payload);
};
