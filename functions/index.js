const admin = require("firebase-admin");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { buildEvents } = require("./detectFinalization");

admin.initializeApp();

const notificationWebhookUrl = defineSecret("NOTIFICATION_WEBHOOK_URL");
const notificationWebhookSecret = defineSecret("NOTIFICATION_WEBHOOK_SECRET");

const postNotification = async (payload) => {
  const url = notificationWebhookUrl.value();
  const secret = notificationWebhookSecret.value();

  if (!url || !secret) {
    console.error("Notification webhook is not configured");
    return;
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
};

const loadContext = async (boardId, listId) => {
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
    memberEmails: board.memberEmails || [],
    boardId,
    listId,
  };
};

exports.onTareaFinalized = onDocumentWritten(
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
      const context = await loadContext(boardId, listId);
      const events = buildEvents(before, after, context.listIsFinalizado);
      if (events.length === 0) return;

      await Promise.all(
        events.map((item) =>
          postNotification({
            ...context,
            tareaId,
            ...item,
          })
        )
      );
    } catch (error) {
      console.error("onTareaFinalized error:", error);
      throw error;
    }
  }
);
