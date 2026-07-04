import { db } from "./firebase";
import { getUser, requireAuthUser, waitForAuthUser } from "./user";

// ─── HELPER: Board global ref ─────────────────────────────────────────────────

const globalBoardRef = (boardKey) => db.collection("boards").doc(boardKey);

// ─── BOARDS (Global — multi-usuario) ─────────────────────────────────────────

export const doCreateBoard = async (board) => {
  // waitForAuthUser evita la race condition donde auth.currentUser
  // aún es null justo después del login antes de que Firebase lo resuelva.
  const user = await waitForAuthUser();
  const { uid, email } = user;
  const displayName = user.displayName || email;
  const photoURL = user.photoURL || null;

  const boardData = {
    title: board.title,
    ownerId: uid,
    members: [{ uid, email, displayName, photoURL }],
    memberEmails: [email],
  };

  try {
    const ref = await db.collection("boards").add(boardData);
    await db
      .collection("users")
      .doc(uid)
      .collection("boardRefs")
      .doc(ref.id)
      .set({ boardId: ref.id });

    return { ...boardData, key: ref.id };
  } catch (error) {
    console.error("Error creating board:", error);
    throw error;
  }
};

export const doDeleteBoard = async (boardKey) => {
  const uid = getUser().uid;
  const listsSnap = await globalBoardRef(boardKey).collection("lists").get();

  const deletions = [];
  listsSnap.forEach((listDoc) => {
    deletions.push(doDeleteList(boardKey, listDoc.id));
  });
  await Promise.all(deletions);

  // Eliminar referencia en el perfil del usuario
  await db.collection("users").doc(uid).collection("boardRefs").doc(boardKey).delete();

  return globalBoardRef(boardKey).delete();
};

export const doUpdateBoard = async (boardKey, data) => {
  await globalBoardRef(boardKey).update(data);
};

export const onceGetBoards = async (uid, email) => {
  // Una sola query por memberEmails cubre tanto boards propios como compartidos,
  // ya que doCreateBoard añade al creador en memberEmails.
  const snap = await db
    .collection("boards")
    .where("memberEmails", "array-contains", email)
    .get();

  const boards = [];
  snap.forEach((doc) => boards.push({ key: doc.id, ...doc.data() }));
  return boards;
};

export const onceGetBoard = async (boardKey) => {
  const snap = await globalBoardRef(boardKey).get();
  return snap.exists ? { key: snap.id, ...snap.data() } : null;
};

// ─── MIEMBROS ─────────────────────────────────────────────────────────────────

export const doAddMember = async (boardKey, memberEmail) => {
  const boardSnap = await globalBoardRef(boardKey).get();
  const boardData = boardSnap.data();
  const members = boardData.members || [];
  const memberEmails = boardData.memberEmails || [];

  // Evitar duplicados
  if (memberEmails.includes(memberEmail)) return { alreadyExists: true };

  const newMember = {
    email: memberEmail,
    displayName: memberEmail, // Se actualizará cuando el usuario ingrese
    photoURL: null,
    uid: null, // Se completará cuando el usuario haga login
  };

  await globalBoardRef(boardKey).update({
    members: [...members, newMember],
    memberEmails: [...memberEmails, memberEmail],
  });

  return newMember;
};

export const onceGetMembers = async (boardKey) => {
  const snap = await globalBoardRef(boardKey).get();
  if (!snap.exists) return [];
  return snap.data().members || [];
};

// Actualiza uid del miembro cuando hace login (llamar al iniciar sesión)
export const doClaimMembership = async (user) => {
  if (!user?.uid || !user?.email) return;
  const { uid, email, displayName, photoURL } = user;

  const snap = await db
    .collection("boards")
    .where("memberEmails", "array-contains", email)
    .get()
    .catch(() => ({ forEach: () => {} }));

  const batch = db.batch();
  let hasChanges = false;

  snap.forEach((doc) => {
    // Guardar referencia siempre (idempotente)
    batch.set(
      db.collection("users").doc(uid).collection("boardRefs").doc(doc.id),
      { boardId: doc.id }
    );
    hasChanges = true;

    // Actualizar uid del miembro si falta
    const data = doc.data();
    const members = data.members || [];
    const needsUidUpdate = members.some((m) => m.email === email && !m.uid);
    if (needsUidUpdate) {
      const updated = members.map((m) =>
        m.email === email && !m.uid
          ? { ...m, uid, displayName: displayName || email, photoURL: photoURL || null }
          : m
      );
      batch.update(doc.ref, { members: updated });
    }
  });

  if (hasChanges) await batch.commit();
};

// ─── LISTS ───────────────────────────────────────────────────────────────────

export const onceGetLists = async (boardKey) => {
  const snap = await globalBoardRef(boardKey)
    .collection("lists")
    .orderBy("index")
    .get();
  const lists = [];
  snap.forEach((doc) => lists.push({ key: doc.id, ...doc.data() }));
  return lists;
};

export const doCreateList = async (boardKey, list) => {
  const listsRef = globalBoardRef(boardKey).collection("lists");
  const snap = await listsRef.get();
  const index = snap.size;
  const ref = await listsRef.add({ ...list, index });
  return { ...list, key: ref.id, index };
};

export const doDeleteList = async (boardKey, listKey) => {
  const tareasSnap = await globalBoardRef(boardKey)
    .collection("lists")
    .doc(listKey)
    .collection("tareas")
    .get();

  const batch = db.batch();
  tareasSnap.forEach((doc) => batch.delete(doc.ref));
  batch.delete(globalBoardRef(boardKey).collection("lists").doc(listKey));
  return batch.commit();
};

export const doUpdateList = async (boardKey, listKey, data) => {
  await globalBoardRef(boardKey).collection("lists").doc(listKey).update(data);
  return data;
};

export const onListMove = async (params) => {
  const { boardKey, lists } = params;
  const batch = db.batch();
  lists.forEach((list, index) => {
    const ref = globalBoardRef(boardKey).collection("lists").doc(list.key);
    batch.update(ref, { index });
  });
  return batch.commit();
};

// ─── TAREAS ───────────────────────────────────────────────────────────────────

const tareasColRef = (boardKey, listKey) =>
  globalBoardRef(boardKey).collection("lists").doc(listKey).collection("tareas");

export const onceGetTarea = async (boardKey, listKey) => {
  const snap = await tareasColRef(boardKey, listKey).orderBy("index").get();
  const tareas = [];
  snap.forEach((doc) => tareas.push({ key: doc.id, ...doc.data() }));
  return tareas;
};

export const doAddTarea = async (boardKey, listKey, tareaTitle) => {
  const ref = tareasColRef(boardKey, listKey);
  const snap = await ref.get();
  const index = snap.size;
  const docRef = await ref.add({ title: tareaTitle, index });
  return { key: docRef.id, title: tareaTitle, index };
};

export const doEditTarea = async (boardKey, listKey, tareaKey, tarea) => {
  await tareasColRef(boardKey, listKey).doc(tareaKey).update(tarea);
  return { ...tarea, key: tareaKey };
};

export const doDeleteTarea = async (boardKey, listKey, tareaKey) => {
  return tareasColRef(boardKey, listKey).doc(tareaKey).delete();
};

// ─── COMENTARIOS ─────────────────────────────────────────────────────────────

const commentsColRef = (boardKey, listKey, tareaKey, subtaskId = null) => {
  const base = tareasColRef(boardKey, listKey).doc(tareaKey);
  if (subtaskId) return base.collection("subtaskComments").doc(subtaskId).collection("comments");
  return base.collection("comments");
};

export const doAddComment = async (boardKey, listKey, tareaKey, comment, subtaskId = null) => {
  const ref = commentsColRef(boardKey, listKey, tareaKey, subtaskId);
  const docRef = await ref.add({ ...comment, createdAt: new Date().toISOString() });
  return { id: docRef.id, ...comment, createdAt: new Date().toISOString() };
};

export const doEditComment = async (boardKey, listKey, tareaKey, commentId, text, subtaskId = null) => {
  const ref = commentsColRef(boardKey, listKey, tareaKey, subtaskId).doc(commentId);
  const updatedAt = new Date().toISOString();
  await ref.update({ text, updatedAt });
  return { updatedAt };
};

export const onceGetComments = async (boardKey, listKey, tareaKey, subtaskId = null) => {
  const snap = await commentsColRef(boardKey, listKey, tareaKey, subtaskId)
    .orderBy("createdAt", "asc")
    .get();
  const comments = [];
  snap.forEach((doc) => comments.push({ id: doc.id, ...doc.data() }));
  return comments;
};

export const doDeleteComment = async (boardKey, listKey, tareaKey, commentId, subtaskId = null) => {
  await commentsColRef(boardKey, listKey, tareaKey, subtaskId).doc(commentId).delete();
};

export const doMoveTarea = async (params) => {
  const { boardKey, oldListKey, newListKey, tareaKey, tareas } = params;
  const batch = db.batch();

  const oldTareaRef = tareasColRef(boardKey, oldListKey).doc(tareaKey);
  const oldTareaSnap = await oldTareaRef.get();
  const tareaData = oldTareaSnap.data();

  batch.delete(oldTareaRef);

  const newListTareasRef = tareasColRef(boardKey, newListKey);
  tareas.forEach((tarea, index) => {
    const ref =
      tarea.key === tareaKey
        ? newListTareasRef.doc(tareaKey)
        : newListTareasRef.doc(tarea.key);
    batch.set(
      ref,
      { ...(tarea.key === tareaKey ? tareaData : tarea), index },
      { merge: true }
    );
  });

  await batch.commit();
  return onceGetTarea(boardKey, newListKey);
};
