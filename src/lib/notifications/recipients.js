import { ALL_MEMBERS_EVENTS } from "./eventTypes";

export const resolveMemberEmails = (payload = {}) => {
  const fromField = payload.memberEmails || [];
  const fromMembers = (payload.members || [])
    .map((m) => m.email)
    .filter(Boolean);
  return [...new Set([...fromField, ...fromMembers].filter(Boolean))];
};

const normalizeEmail = (email) => email?.toLowerCase?.().trim() || "";

const resolveActorEmails = (payload = {}) => {
  const emails = new Set();

  const direct = normalizeEmail(
    payload.actorEmail || payload.authorEmail || payload.senderEmail,
  );
  if (direct) emails.add(direct);

  const actorId =
    payload.actorId || payload.authorId || payload.senderId || null;
  if (actorId && payload.members?.length) {
    const actorMember = payload.members.find(
      (member) => member.uid === actorId || member.id === actorId,
    );
    const memberEmail = normalizeEmail(actorMember?.email);
    if (memberEmail) emails.add(memberEmail);
  }

  return emails;
};

export const collectMentionTargetEmails = (payload = {}) => {
  const emails = [
    ...(payload.parsedTargetEmails || []),
    ...(payload.mentionedEmails || []),
    ...(payload.comment?.mentionedEmails || []),
    ...(payload.recipientEmail ? [payload.recipientEmail] : []),
  ];

  return [...new Set(emails.map(normalizeEmail).filter(Boolean))];
};

export const resolveMentionRecipients = (payload) => {
  const actorEmails = resolveActorEmails(payload);
  const targets = collectMentionTargetEmails(payload);

  // Filtramos a los autores (auto-mención) y garantizamos emails válidos
  return targets.filter((email) => {
    if (!email) return false;
    // Si el usuario se menciona a sí mismo, se omite el envío para él.
    if (actorEmails.has(email)) return false;

    // Aquí se podrían inyectar validaciones de preferencias de notificación
    // ej: if (!userPrefs.notifyOnMentions) return false;

    return true;
  });
};

export const resolveNotificationRecipients = (payload) => {
  const { eventType, recipientEmail, actorEmail } = payload;

  if (eventType === "mention") {
    return resolveMentionRecipients(payload);
  }

  if (eventType === "assignee_changed") {
    if (!recipientEmail) return [];
    if (normalizeEmail(recipientEmail) === normalizeEmail(actorEmail))
      return [];
    return [recipientEmail];
  }

  if (ALL_MEMBERS_EVENTS.has(eventType)) {
    return resolveMemberEmails(payload);
  }

  return resolveMemberEmails(payload);
};
