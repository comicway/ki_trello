import { getAdminFirestore } from "@/lib/firebaseAdmin";

const FINALIZADO = "finalizado";

export const resolveMemberEmails = (board = {}) => {
  const fromField = board.memberEmails || [];
  const fromMembers = (board.members || []).map((m) => m.email).filter(Boolean);
  return [...new Set([...fromField, ...fromMembers].filter(Boolean))];
};

export async function loadNotificationContext({ boardId, listId, tareaId, itemType, subtaskId }) {
  const db = getAdminFirestore();
  const [boardSnap, listSnap, tareaSnap] = await Promise.all([
    db.doc(`boards/${boardId}`).get(),
    db.doc(`boards/${boardId}/lists/${listId}`).get(),
    db.doc(`boards/${boardId}/lists/${listId}/tareas/${tareaId}`).get(),
  ]);

  if (!boardSnap.exists || !listSnap.exists || !tareaSnap.exists) {
    throw new Error("Board, list or tarea not found");
  }

  const board = boardSnap.data();
  const list = listSnap.data();
  const tarea = tareaSnap.data();
  const listIsFinalizado = list.title?.trim().toLowerCase() === FINALIZADO;

  if (itemType === "subtask") {
    const sub = (tarea.subtasks || []).find((s) => s.id === subtaskId);
    if (!sub?.done) throw new Error("Subtask is not finalized");

    return {
      boardTitle: board.title || "Board",
      listTitle: list.title || "Lista",
      itemType: "subtask",
      itemTitle: sub.title || "Subtarea sin título",
      assigneeEmail: sub.assigneeEmail || null,
      completedBy: sub.doneBy || tarea.doneBy || null,
      completedAt: sub.doneAt || tarea.doneAt || new Date().toISOString(),
      boardId,
      listId,
      tareaId,
      subtaskId,
      members: board.members || [],
      memberEmails: resolveMemberEmails(board),
    };
  }

  if (!tarea.done && !listIsFinalizado) {
    throw new Error("Tarea is not finalized");
  }

  return {
    boardTitle: board.title || "Board",
    listTitle: list.title || "Lista",
    itemType: "tarea",
    itemTitle: tarea.title || "Sin título",
    assigneeEmail: tarea.assigneeEmail || null,
    completedBy: tarea.doneBy || null,
    completedAt: tarea.doneAt || new Date().toISOString(),
    boardId,
    listId,
    tareaId,
    members: board.members || [],
    memberEmails: resolveMemberEmails(board),
  };
}

export async function assertBoardMember(boardId, email) {
  const db = getAdminFirestore();
  const boardSnap = await db.doc(`boards/${boardId}`).get();
  if (!boardSnap.exists) throw new Error("Board not found");

  const memberEmails = resolveMemberEmails(boardSnap.data()).map((e) => e.toLowerCase());
  if (!memberEmails.includes(email.toLowerCase())) {
    throw new Error("Forbidden");
  }
}
