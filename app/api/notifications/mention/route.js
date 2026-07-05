import { NextResponse } from "next/server";
import { verifyFirebaseIdToken, getAdminFirestore } from "@/lib/firebaseAdmin";
import { assertBoardMember, resolveMemberEmails } from "@/lib/notifications/loadNotificationContext";
import { buildCommentEvents } from "@/lib/notifications/detectTareaEvents";
import { dispatchNotification } from "@/lib/notifications/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBearerToken = (request) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
};

const loadCommentContext = async ({ boardId, listId, tareaId, commentId, subtaskId }) => {
  const db = getAdminFirestore();
  const commentRef = subtaskId
    ? db.doc(
        `boards/${boardId}/lists/${listId}/tareas/${tareaId}/subtaskComments/${subtaskId}/comments/${commentId}`
      )
    : db.doc(`boards/${boardId}/lists/${listId}/tareas/${tareaId}/comments/${commentId}`);

  const [boardSnap, listSnap, tareaSnap, commentSnap] = await Promise.all([
    db.doc(`boards/${boardId}`).get(),
    db.doc(`boards/${boardId}/lists/${listId}`).get(),
    db.doc(`boards/${boardId}/lists/${listId}/tareas/${tareaId}`).get(),
    commentRef.get(),
  ]);

  if (!boardSnap.exists || !listSnap.exists || !tareaSnap.exists || !commentSnap.exists) {
    throw new Error("Comment context not found");
  }

  const board = boardSnap.data();
  const list = listSnap.data();
  const tarea = tareaSnap.data();
  const comment = commentSnap.data();

  let itemTitle = tarea.title || "Sin título";
  if (subtaskId) {
    const sub = (tarea.subtasks || []).find((s) => s.id === subtaskId);
    itemTitle = sub?.title || itemTitle;
  }

  const members = board.members || [];
  const memberEmails = resolveMemberEmails(board);

  memberEmails.forEach((email) => {
    if (members.some((m) => m.email === email)) return;
    members.push({ email, displayName: email, uid: null, photoURL: null });
  });

  return {
    boardTitle: board.title || "Board",
    listTitle: list.title || "Lista",
    boardId,
    listId,
    tareaId,
    subtaskId: subtaskId || null,
    commentId,
    itemTitle,
    members,
    memberEmails,
    comment,
  };
};

export async function POST(request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(token);
    const body = await request.json();
    const { boardId, listId, tareaId, commentId, subtaskId = null } = body;

    if (!boardId || !listId || !tareaId || !commentId) {
      return NextResponse.json({ error: "Missing comment identifiers" }, { status: 400 });
    }

    await assertBoardMember(boardId, decoded.email);

    const context = await loadCommentContext({ boardId, listId, tareaId, commentId, subtaskId });
    const events = buildCommentEvents(context.comment, context);

    if (events.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, skipped: true, reason: "no_mentions" });
    }

    const results = await Promise.all(
      events.map((event) =>
        dispatchNotification({
          ...context,
          ...event,
        })
      )
    );

    return NextResponse.json({ ok: true, sent: results.length, results });
  } catch (error) {
    console.error("mention notification error:", error.message);
    return NextResponse.json(
      { error: error.message || "Mention notification failed" },
      { status: error.message === "Forbidden" ? 403 : 500 }
    );
  }
}
