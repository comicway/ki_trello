const FINALIZADO = "finalizado";
const {
  extractMentionTargetsFromComment,
  extractNewMentionTargets,
} = require("./mentions");

const EVENT_TYPES = {
  TASK_COMPLETED: "task_completed",
  SUBTASK_COMPLETED: "subtask_completed",
  SALESFORCE_READY: "salesforce_ready",
  MENTION: "mention",
  STATUS_CHANGED: "status_changed",
  ASSIGNEE_CHANGED: "assignee_changed",
};

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
        recipientUid: target.uid || null,
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
  const hasMentions = (comment?.mentionedEmails || []).length > 0;
  if (!comment?.text && !hasMentions) return [];

  const targets = extractMentionTargetsFromComment(comment, context.members || []);
  const parsedTargetEmails = targets.map((target) => target.email);

  return targets.map((target) => ({
      eventType: EVENT_TYPES.MENTION,
      idempotencyKey: `mention:comment:${context.commentId}:${target.email}`,
      itemType: context.subtaskId ? "subtask" : "tarea",
      subtaskId: context.subtaskId || null,
      itemTitle: context.itemTitle || "Sin título",
      recipientEmail: target.email,
      recipientUid: target.uid || null,
      parsedTargetEmails,
      taskAssigneeEmail: context.taskAssigneeEmail || null,
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
