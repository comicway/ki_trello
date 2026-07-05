export const EVENT_TYPES = {
  TASK_COMPLETED: "task_completed",
  SUBTASK_COMPLETED: "subtask_completed",
  SALESFORCE_READY: "salesforce_ready",
  MENTION: "mention",
  STATUS_CHANGED: "status_changed",
  ASSIGNEE_CHANGED: "assignee_changed",
};

export const ALL_MEMBERS_EVENTS = new Set([
  EVENT_TYPES.TASK_COMPLETED,
  EVENT_TYPES.SUBTASK_COMPLETED,
  EVENT_TYPES.SALESFORCE_READY,
  EVENT_TYPES.STATUS_CHANGED,
]);
