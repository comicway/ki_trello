import { ALL_MEMBERS_EVENTS } from "./eventTypes";

export const resolveMemberEmails = (payload = {}) => {
  const fromField = payload.memberEmails || [];
  const fromMembers = (payload.members || []).map((m) => m.email).filter(Boolean);
  return [...new Set([...fromField, ...fromMembers].filter(Boolean))];
};

export const resolveNotificationRecipients = (payload) => {
  const { eventType, recipientEmail, actorEmail } = payload;

  if (eventType === "mention") {
    if (!recipientEmail) return [];
    return [recipientEmail];
  }

  if (eventType === "assignee_changed") {
    if (!recipientEmail) return [];
    if (recipientEmail.toLowerCase() === actorEmail?.toLowerCase()) return [];
    return [recipientEmail];
  }

  if (ALL_MEMBERS_EVENTS.has(eventType)) {
    return resolveMemberEmails(payload);
  }

  return resolveMemberEmails(payload);
};
