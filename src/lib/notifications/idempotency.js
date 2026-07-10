import { getAdminFirestore } from "@/lib/firebaseAdmin";

export const claimNotificationDelivery = async (boardId, idempotencyKey, metadata = {}) => {
  if (!boardId || !idempotencyKey) {
    throw new Error("Idempotency key is required");
  }

  const db = getAdminFirestore();
  const ref = db.doc(`boards/${boardId}/_notificationDeliveries/${idempotencyKey}`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      return { claimed: false, duplicate: true, delivery: snap.data() };
    }

    const delivery = {
      ...metadata,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    tx.set(ref, delivery);
    return { claimed: true, duplicate: false, delivery };
  });
};
