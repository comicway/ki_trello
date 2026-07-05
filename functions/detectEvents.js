const FINALIZADO = "finalizado";

const EVENT_TYPES = {
  TASK_COMPLETED: "task_completed",
  SUBTASK_COMPLETED: "subtask_completed",
  SALESFORCE_READY: "salesforce_ready",
  MENTION: "mention",
  STATUS_CHANGED: "status_changed",
  ASSIGNEE_CHANGED: "assignee_changed",
};

const MENTION_RE = /@([^\s@][^\s]*)/g;

const extractMentions = (text = "") => {
  const mentions = [];
  for (const match of text.matchAll(MENTION_RE)) {
    if (match[1]) mentions.push(match[1].trim());
  }
  return [...new Set(mentions)];
};

const resolveMentionEmail = (mentionName, members = []) => {
  const normalized = mentionName.toLowerCase();
  const match = members.find((member) => {
    const displayName = (member.displayName || "").toLowerCase();
    const email = (member.email || "").toLowerCase();
    return (
      displayName === normalized ||
      email === normalized ||
      email.startsWith(`${normalized}@`)
    );
  });
  return match?.email || null;
};

const buildMentionFragment = (text, mentionName) => {
  const idx = text.toLowerCase().indexOf(`@${mentionName.toLowerCase()}`);
  if (idx === -1) return text.slice(0, 140);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + mentionName.length + 80);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
};

const extractNewMentionTargets = (beforeText = "", afterText = "", members = []) => {
  const beforeSet = new Set(
    extractMentions(beforeText)
      .map((name) => resolveMentionEmail(name, members))
      .filter(Boolean)
  );

  const targets = [];
  for (const name of extractMentions(afterText)) {
    const email = resolveMentionEmail(name, members);
    if (!email || beforeSet.has(email)) continue;
    targets.push({
      email,
      messageFragment: buildMentionFragment(afterText, name),
    });
  }
  return targets;
};

const extractCommentMentionTargets = (text = "", members = []) =>
  extractMentions(text)
    .map((name) => {
      const email = resolveMentionEmail(name, members);
      if (!email) return null;
      return {
        email,
        messageFragment: buildMentionFragment(text, name),
      };
    })
    .filter(Boolean);

const wasTareaJustCompleted = (before, after) => !before?.done && !!after?.done;

const findNewlyCompletedSubtasks = (before, after) => {
  const beforeMap = new Map((before?.subtasks || []).map((s) => [s.id, s]));
  return (after?.subtasks || []).filter((s) => s.done && !beforeMap.get(s.id)?.done);
};

const actorFrom = (after) => after?.lastEditedBy || after?.doneBy || "Un miembro";

const buildTareaEvents = (before, after, context) => {
  if (!after) return [];

  const { listIsFinalizado, members = [] } = context;
  const events = [];
  const actorName = actorFrom(after);

  const notifyTarea =
    wasTareaJustCompleted(before, after) ||
    (!before && (!!after?.done || listIsFinalizado));

  if (notifyTarea) {
    events.push({
      eventType: EVENT_TYPES.TASK_COMPLETED,
      idempotencyKey: `task_completed:tarea:${context.tareaId}:${after.doneAt || "now"}`,
      itemType: "tarea",
      itemTitle: after.title || "Sin título",
      assigneeEmail: after.assigneeEmail || null,
      completedBy: after.doneBy || actorName,
      completedAt: after.doneAt || new Date().toISOString(),
    });
  }

  findNewlyCompletedSubtasks(before, after).forEach((sub) => {
    events.push({
      eventType: EVENT_TYPES.SUBTASK_COMPLETED,
      idempotencyKey: `subtask_completed:${context.tareaId}:${sub.id}:${sub.doneAt || after.doneAt || "now"}`,
      itemType: "subtask",
      subtaskId: sub.id,
      itemTitle: sub.title || "Subtarea sin título",
      assigneeEmail: sub.assigneeEmail || null,
      completedBy: sub.doneBy || after.doneBy || actorName,
      completedAt: sub.doneAt || after.doneAt || new Date().toISOString(),
    });
  });

  if (!before?.readyForSalesforce && after.readyForSalesforce) {
    events.push({
      eventType: EVENT_TYPES.SALESFORCE_READY,
      idempotencyKey: `salesforce_ready:tarea:${context.tareaId}`,
      itemType: "tarea",
      itemTitle: after.title || "Sin título",
      actorName,
    });
  }

  (after.subtasks || []).forEach((sub) => {
    const prev = (before?.subtasks || []).find((s) => s.id === sub.id);
    if (!prev?.readyForSalesforce && sub.readyForSalesforce) {
      events.push({
        eventType: EVENT_TYPES.SALESFORCE_READY,
        idempotencyKey: `salesforce_ready:subtask:${context.tareaId}:${sub.id}`,
        itemType: "subtask",
        subtaskId: sub.id,
        itemTitle: sub.title || "Subtarea sin título",
        actorName,
      });
    }
  });

  if (after.assigneeEmail && before?.assigneeEmail !== after.assigneeEmail) {
    events.push({
      eventType: EVENT_TYPES.ASSIGNEE_CHANGED,
      idempotencyKey: `assignee_changed:tarea:${context.tareaId}:${after.assigneeEmail}`,
      itemType: "tarea",
      itemTitle: after.title || "Sin título",
      recipientEmail: after.assigneeEmail,
      actorName,
      actorEmail: after.lastEditedByEmail || null,
    });
  }

  (after.subtasks || []).forEach((sub) => {
    const prev = (before?.subtasks || []).find((s) => s.id === sub.id);
    if (sub.assigneeEmail && prev?.assigneeEmail !== sub.assigneeEmail) {
      events.push({
        eventType: EVENT_TYPES.ASSIGNEE_CHANGED,
        idempotencyKey: `assignee_changed:subtask:${context.tareaId}:${sub.id}:${sub.assigneeEmail}`,
        itemType: "subtask",
        subtaskId: sub.id,
        itemTitle: sub.title || "Subtarea sin título",
        recipientEmail: sub.assigneeEmail,
        actorName,
        actorEmail: after.lastEditedByEmail || null,
      });
    }
  });

  if (
    after.lastStatusChange?.changedAt &&
    before?.lastStatusChange?.changedAt !== after.lastStatusChange.changedAt
  ) {
    events.push({
      eventType: EVENT_TYPES.STATUS_CHANGED,
      idempotencyKey: `status_changed:${context.tareaId}:${after.lastStatusChange.changedAt}`,
      itemType: "tarea",
      itemTitle: after.title || "Sin título",
      fromListTitle: after.lastStatusChange.fromListTitle || "—",
      toListTitle: after.lastStatusChange.toListTitle || "—",
      actorName: after.lastStatusChange.changedBy || actorName,
    });
  }

  if (before?.description !== after.description) {
    extractNewMentionTargets(before?.description, after.description, members).forEach((target) => {
      events.push({
        eventType: EVENT_TYPES.MENTION,
        idempotencyKey: `mention:description:${context.tareaId}:${target.email}:${after.description?.length || 0}`,
        itemType: "tarea",
        itemTitle: after.title || "Sin título",
        recipientEmail: target.email,
        mentionSource: "description",
        messageFragment: target.messageFragment,
        actorName,
        actorEmail: after.lastEditedByEmail || null,
      });
    });
  }

  return events;
};

const buildCommentEvents = (comment, context) => {
  if (!comment?.text) return [];

  return extractCommentMentionTargets(comment.text, context.members || []).map((target) => ({
    eventType: EVENT_TYPES.MENTION,
    idempotencyKey: `mention:comment:${context.commentId}:${target.email}`,
    itemType: context.subtaskId ? "subtask" : "tarea",
    subtaskId: context.subtaskId || null,
    itemTitle: context.itemTitle || "Sin título",
    recipientEmail: target.email,
    mentionSource: "comment",
    messageFragment: target.messageFragment,
    actorName: comment.authorName || comment.authorEmail || "Un miembro",
    actorEmail: comment.authorEmail || null,
  }));
};

module.exports = {
  isFinalizadoTitle: (title) => title?.trim().toLowerCase() === FINALIZADO,
  buildTareaEvents,
  buildCommentEvents,
};
