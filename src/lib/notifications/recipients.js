import { ALL_MEMBERS_EVENTS } from "./eventTypes";

export const resolveMemberEmails = (payload = {}) => {
  const fromField = payload.memberEmails || [];
  const fromMembers = (payload.members || []).map((m) => m.email).filter(Boolean);
  return [...new Set([...fromField, ...fromMembers].filter(Boolean))];
};

const normalizeEmail = (email) => email?.toLowerCase?.().trim() || "";

const resolveActorEmails = (payload = {}) => {
  const emails = new Set();

  const direct = normalizeEmail(
    payload.actorEmail || payload.authorEmail || payload.senderEmail
  );
  if (direct) emails.add(direct);

  const actorId = payload.actorId || payload.authorId || payload.senderId || null;
  if (actorId && payload.members?.length) {
    const actorMember = payload.members.find(
      (member) => member.uid === actorId || member.id === actorId
    );
    const memberEmail = normalizeEmail(actorMember?.email);
    if (memberEmail) emails.add(memberEmail);
  }

  return emails;
};

export const resolveMentionRecipients = (payload) => {
  const actorEmails = resolveActorEmails(payload);

  return (payload.parsedTargetEmails || [])
    .map(normalizeEmail)
    .filter(Boolean)
    .filter((email) => !actorEmails.has(email));
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
