const admin = require("firebase-admin");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { buildTareaEvents, buildCommentEvents } = require("./detectEvents");

admin.initializeApp();

const notificationWebhookUrl = defineSecret("NOTIFICATION_WEBHOOK_URL");
const notificationWebhookSecret = defineSecret("NOTIFICATION_WEBHOOK_SECRET");

const resolveMemberEmails = (board = {}) => {
  const fromField = board.memberEmails || [];
  const fromMembers = (board.members || []).map((m) => m.email).filter(Boolean);
  return [...new Set([...fromField, ...fromMembers].filter(Boolean))];
};

const postNotification = async (payload) => {
  const url = notificationWebhookUrl.value()?.trim();
  const secret = notificationWebhookSecret.value()?.trim();

  if (!url || !secret) {
    throw new Error("Notification webhook is not configured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webhook failed (${response.status}): ${body}`);
  }

  return response.json().catch(() => ({}));
};

const loadBoardListContext = async (boardId, listId) => {
  const db = admin.firestore();
  const [boardSnap, listSnap] = await Promise.all([
    db.doc(`boards/${boardId}`).get(),
    db.doc(`boards/${boardId}/lists/${listId}`).get(),
  ]);

  const board = boardSnap.data() || {};
  const list = listSnap.data() || {};

  return {
    boardTitle: board.title || "Board",
    listTitle: list.title || "Lista",
    listIsFinalizado: list.title?.trim().toLowerCase() === "finalizado",
    members: board.members || [],
    memberEmails: resolveMemberEmails(board),
    boardId,
    listId,
  };
};

const dispatchEvents = async (events, context) => {
  if (events.length === 0) return;

  await Promise.all(
    events.map((event) =>
      postNotification({
        ...context,
        ...event,
      })
    )
  );
};

exports.onTareaNotification = onDocumentWritten(
  {
    document: "boards/{boardId}/lists/{listId}/tareas/{tareaId}",
    secrets: [notificationWebhookUrl, notificationWebhookSecret],
  },
  async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;

    if (!after) return;

    const { boardId, listId, tareaId } = event.params;

    try {
      const context = await loadBoardListContext(boardId, listId);
      const events = buildTareaEvents(before, after, {
        ...context,
        tareaId,
      });

      await dispatchEvents(events, { ...context, tareaId });
    } catch (error) {
      console.error("onTareaNotification error:", error);
      throw error;
    }
  }
);

const handleCommentCreated = async ({ boardId, listId, tareaId, commentId, subtaskId, comment }) => {
  const db = admin.firestore();
  const context = await loadBoardListContext(boardId, listId);
  const tareaSnap = await db.doc(`boards/${boardId}/lists/${listId}/tareas/${tareaId}`).get();
  const tarea = tareaSnap.data() || {};

  let itemTitle = tarea.title || "Sin título";
  if (subtaskId) {
    const sub = (tarea.subtasks || []).find((s) => s.id === subtaskId);
    itemTitle = sub?.title || itemTitle;
  }

  const events = buildCommentEvents(comment, {
    ...context,
    tareaId,
    subtaskId,
    commentId,
    itemTitle,
  });

  await dispatchEvents(events, { ...context, tareaId, subtaskId });
};

exports.onTareaCommentCreated = onDocumentCreated(
  {
    document: "boards/{boardId}/lists/{listId}/tareas/{tareaId}/comments/{commentId}",
    secrets: [notificationWebhookUrl, notificationWebhookSecret],
  },
  async (event) => {
    const comment = event.data?.data();
    if (!comment) return;

    const { boardId, listId, tareaId, commentId } = event.params;

    try {
      await handleCommentCreated({ boardId, listId, tareaId, commentId, subtaskId: null, comment });
    } catch (error) {
      console.error("onTareaCommentCreated error:", error);
      throw error;
    }
  }
);

exports.onSubtaskCommentCreated = onDocumentCreated(
  {
    document:
      "boards/{boardId}/lists/{listId}/tareas/{tareaId}/subtaskComments/{subtaskId}/comments/{commentId}",
    secrets: [notificationWebhookUrl, notificationWebhookSecret],
  },
  async (event) => {
    const comment = event.data?.data();
    if (!comment) return;

    const { boardId, listId, tareaId, subtaskId, commentId } = event.params;

    try {
      await handleCommentCreated({ boardId, listId, tareaId, commentId, subtaskId, comment });
    } catch (error) {
      console.error("onSubtaskCommentCreated error:", error);
      throw error;
    }
  }
);

// Backward-compatible export name
exports.onTareaFinalized = exports.onTareaNotification;
