import { getAdminFirestore } from "@/lib/firebaseAdmin";

const FRAGMENT_MAX = 50;

export const encodeEmailKey = (email = "") =>
  email.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");

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

const mapDeliveryDoc = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    idempotencyKey: data.idempotencyKey || doc.id,
    eventType: data.eventType || "unknown",
    boardId: data.boardId || null,
    tareaId: data.tareaId || null,
    boardTitle: data.boardTitle || null,
    itemTitle: data.itemTitle || null,
    actorName: data.actorName || "Ki Trello",
    actorEmail: data.actorEmail || null,
    messageFragment: data.messageFragment || buildFeedFragment(data),
    recipientEmail: data.recipientEmail || null,
    createdAt: data.createdAt || null,
  };
};

const mergeNotifications = (items, limit) => {
  const seen = new Set();
  return items
    .filter((item) => {
      const key = item.idempotencyKey || item.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return Boolean(item.createdAt);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

export const recordFeedEntries = async (recipients, payload) => {
  if (!recipients?.length) return;

  const db = getAdminFirestore();
  const batch = db.batch();
  const createdAt = new Date().toISOString();
  const actorName = payload.actorName || payload.completedBy || "Ki Trello";
  const messageFragment = buildFeedFragment(payload);

  for (const email of recipients) {
    const normalizedEmail = email.toLowerCase();
    const encoded = encodeEmailKey(normalizedEmail);
    const member = (payload.members || []).find(
      (m) => m.email?.toLowerCase() === normalizedEmail
    );
    const recipientUid =
      member?.uid ||
      (normalizedEmail === payload.recipientEmail?.toLowerCase() ? payload.recipientUid : null);

    const entry = {
      idempotencyKey: payload.idempotencyKey,
      eventType: payload.eventType,
      boardId: payload.boardId || null,
      tareaId: payload.tareaId || null,
      boardTitle: payload.boardTitle || null,
      itemTitle: payload.itemTitle || null,
      actorName,
      actorEmail: payload.actorEmail || null,
      messageFragment,
      recipientEmail: normalizedEmail,
      recipientUid: recipientUid || null,
      createdAt,
    };

    batch.set(
      db.doc(`usersByEmail/${encoded}/notifications/${payload.idempotencyKey}`),
      entry
    );

    if (recipientUid) {
      batch.set(
        db.doc(`users/${recipientUid}/notifications/${payload.idempotencyKey}`),
        entry
      );
    }
  }

  await batch.commit();
};

const loadEmailFeed = async (email, limit) => {
  const db = getAdminFirestore();
  const encoded = encodeEmailKey(email);
  const snap = await db
    .collection(`usersByEmail/${encoded}/notifications`)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const loadUidFeed = async (uid, limit) => {
  if (!uid) return [];

  const db = getAdminFirestore();
  const snap = await db
    .collection(`users/${uid}/notifications`)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const loadDeliveryFallback = async (email, limit) => {
  const db = getAdminFirestore();
  const normalizedEmail = email.toLowerCase();

  try {
    const snap = await db
      .collectionGroup("_notificationDeliveries")
      .where("recipientEmail", "==", normalizedEmail)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map(mapDeliveryDoc);
  } catch (error) {
    console.warn("notification_delivery_fallback:", error.message);
    return [];
  }
};

export const listUserNotifications = async (email, uid, limit = 10) => {
  if (!email) return [];

  const [byEmail, byUid, fromDeliveries] = await Promise.all([
    loadEmailFeed(email, limit),
    loadUidFeed(uid, limit),
    loadDeliveryFallback(email, limit),
  ]);

  return mergeNotifications([...byEmail, ...byUid, ...fromDeliveries], limit);
};
