import { buildNotificationEmail } from "./buildEmail";

export function buildTaskCompletedEmail({
  boardTitle,
  listTitle,
  itemType,
  itemTitle,
  assigneeLabel,
  completedBy,
  completedAt,
  boardUrl,
}) {
  return buildNotificationEmail({
    eventType: itemType === "subtask" ? "subtask_completed" : "task_completed",
    boardTitle,
    listTitle,
    itemType,
    itemTitle,
    assigneeLabel,
    completedBy,
    completedAt,
    boardUrl,
    boardId: "legacy",
    idempotencyKey: "legacy",
    members: [],
  });
}

export { EMAIL_THEME } from "./buildEmail";
