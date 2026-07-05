import { getAdminFirestore } from "@/lib/firebaseAdmin";

const FRAGMENT_MAX = 50;

const truncate = (text = "", max = FRAGMENT_MAX) => {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
};

export const buildFeedFragment = (payload = {}) => {
  if (payload.messageFragment) return truncate(payload.messageFragment);

  const { eventType, itemTitle, fromListTitle, toListTitle } = payload;
  const title = itemTitle || "Sin título";

  const labels = {
    task_completed: `Tarea finalizada: ${title}`,
    subtask_completed: `Subtarea finalizada: ${title}`,
    salesforce_ready: `Listo para Salesforce: ${title}`,
    status_changed: `Estado: ${fromListTitle || "—"} → ${toListTitle || "—"}`,
    assignee_changed: `Nueva asignación: ${title}`,
    mention: truncate(payload.messageFragment || title),
  };

  return truncate(labels[eventType] || title);
};

export const recordFeedEntries = async (recipients, payload) => {
  if (!recipients?.length) return;

  const db = getAdminFirestore();
  const batch = db.batch();
  const createdAt = new Date().toISOString();
  const actorName = payload.actorName || payload.completedBy || "Ki Trello";
  const messageFragment = buildFeedFragment(payload);

  for (const email of recipients) {
    const member = (payload.members || []).find(
      (m) => m.email?.toLowerCase() === email.toLowerCase()
    );
    const recipientUid =
      member?.uid ||
      (email.toLowerCase() === payload.recipientEmail?.toLowerCase() ? payload.recipientUid : null);

    if (!recipientUid) continue;

    const ref = db.doc(`users/${recipientUid}/notifications/${payload.idempotencyKey}`);
    batch.set(ref, {
      idempotencyKey: payload.idempotencyKey,
      eventType: payload.eventType,
      boardId: payload.boardId || null,
      tareaId: payload.tareaId || null,
      boardTitle: payload.boardTitle || null,
      itemTitle: payload.itemTitle || null,
      actorName,
      actorEmail: payload.actorEmail || null,
      messageFragment,
      recipientEmail: email,
      createdAt,
    });
  }

  await batch.commit();
};

export const listUserNotifications = async (uid, limit = 10) => {
  if (!uid) return [];

  const db = getAdminFirestore();
  const snap = await db
    .collection(`users/${uid}/notifications`)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
