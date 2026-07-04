import { db } from "./firebase";
import { getUser, requireAuthUser, waitForAuthUser } from "./user";
import { getOwnerIds, isBoardOwnerUser } from "../utils/boardRoles";

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
    ownerIds: [uid],
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
  const user = getUser();
  const boardSnap = await globalBoardRef(boardKey).get();
  if (!boardSnap.exists) throw new Error("Board no encontrado.");
  if (!isBoardOwnerUser(boardSnap.data(), user?.uid)) {
    throw new Error("Solo un owner puede eliminar el board.");
  }

  const uid = user.uid;
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
  const boardsMap = new Map();

  const addDoc = (doc) => {
    boardsMap.set(doc.id, { key: doc.id, ...doc.data() });
  };

  try {
    const memberSnap = await db
      .collection("boards")
      .where("memberEmails", "array-contains", email)
      .get();
    memberSnap.forEach(addDoc);
  } catch (err) {
    console.error("Error fetching boards by memberEmails:", err);
  }

  try {
    const ownerIdsSnap = await db
      .collection("boards")
      .where("ownerIds", "array-contains", uid)
      .get();
    ownerIdsSnap.forEach((doc) => {
      if (!boardsMap.has(doc.id)) addDoc(doc);
    });
  } catch (err) {
    console.error("Error fetching boards by ownerIds:", err);
  }

  try {
    const ownerSnap = await db
      .collection("boards")
      .where("ownerId", "==", uid)
      .get();
    ownerSnap.forEach((doc) => {
      if (!boardsMap.has(doc.id)) addDoc(doc);
    });
  } catch (err) {
    console.error("Error fetching boards by ownerId:", err);
  }

  // Backfill memberEmails en boards legacy del owner para futuras consultas
  const backfills = [];
  boardsMap.forEach((board, id) => {
    const ownerIds = getOwnerIds(board);
    const updates = {};

    if (ownerIds.includes(uid) && !(board.memberEmails || []).includes(email)) {
      updates.memberEmails = [...(board.memberEmails || []), email];
      updates.members = board.members?.length
        ? board.members
        : [{ uid, email, displayName: getUser()?.displayName || email, photoURL: getUser()?.photoURL || null }];
    }
    if (!board.ownerIds?.length && board.ownerId) {
      updates.ownerIds = [board.ownerId];
    }

    if (Object.keys(updates).length) {
      backfills.push(globalBoardRef(id).update(updates).catch(console.error));
    }
  });
  if (backfills.length) {
    await Promise.all(backfills).catch((err) => {
      console.error("Error en backfill memberEmails:", err);
    });
  }

  return Array.from(boardsMap.values());
};

export const onceGetBoard = async (boardKey) => {
  const snap = await globalBoardRef(boardKey).get();
  return snap.exists ? { key: snap.id, ...snap.data() } : null;
};

// ─── MIEMBROS ─────────────────────────────────────────────────────────────────

export const doAddMember = async (boardKey, memberEmail) => {
  const boardSnap = await globalBoardRef(boardKey).get();
  if (!boardSnap.exists) throw new Error("Board no encontrado.");

  const boardData = boardSnap.data();
  const currentUser = getUser();
  if (!currentUser || !isBoardOwnerUser(boardData, currentUser.uid)) {
    throw new Error("Solo un owner puede agregar miembros.");
  }

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

export const doRemoveMember = async (boardKey, memberEmail) => {
  const boardSnap = await globalBoardRef(boardKey).get();
  if (!boardSnap.exists) throw new Error("Board no encontrado.");

  const boardData = boardSnap.data();
  const currentUser = getUser();
  if (!currentUser || !isBoardOwnerUser(boardData, currentUser.uid)) {
    throw new Error("Solo un owner puede remover miembros.");
  }

  const members = boardData.members || [];
  const memberEmails = boardData.memberEmails || [];
  const target = members.find((m) => m.email === memberEmail);
  const ownerIds = getOwnerIds(boardData);

  if (!target) return { notFound: true };
  if (target.uid && ownerIds.includes(target.uid)) {
    throw new Error("No se puede remover a un owner. Quita el rol Owner primero.");
  }

  await globalBoardRef(boardKey).update({
    members: members.filter((m) => m.email !== memberEmail),
    memberEmails: memberEmails.filter((e) => e !== memberEmail),
  });

  if (target.uid) {
    await db
      .collection("users")
      .doc(target.uid)
      .collection("boardRefs")
      .doc(boardKey)
      .delete()
      .catch(console.error);
  }

  return { removed: true };
};

export const doPromoteToOwner = async (boardKey, memberUid) => {
  const boardSnap = await globalBoardRef(boardKey).get();
  if (!boardSnap.exists) throw new Error("Board no encontrado.");

  const boardData = boardSnap.data();
  const currentUser = getUser();
  if (!currentUser || !isBoardOwnerUser(boardData, currentUser.uid)) {
    throw new Error("Solo un owner puede promover a otros.");
  }

  const member = (boardData.members || []).find((m) => m.uid === memberUid);
  if (!member) throw new Error("El miembro no tiene cuenta vinculada.");

  const ownerIds = getOwnerIds(boardData);
  if (ownerIds.includes(memberUid)) return { ownerIds, alreadyOwner: true };

  const updatedOwnerIds = [...ownerIds, memberUid];
  await globalBoardRef(boardKey).update({
    ownerIds: updatedOwnerIds,
    ownerId: updatedOwnerIds[0],
  });
  return { ownerIds: updatedOwnerIds };
};

export const doDemoteOwner = async (boardKey, memberUid) => {
  const boardSnap = await globalBoardRef(boardKey).get();
  if (!boardSnap.exists) throw new Error("Board no encontrado.");

  const boardData = boardSnap.data();
  const currentUser = getUser();
  if (!currentUser || !isBoardOwnerUser(boardData, currentUser.uid)) {
    throw new Error("Solo un owner puede quitar el rol Owner.");
  }

  const ownerIds = getOwnerIds(boardData);
  if (!ownerIds.includes(memberUid)) return { ownerIds, notOwner: true };
  if (ownerIds.length <= 1) {
    throw new Error("Debe existir al menos un owner en el board.");
  }

  const updatedOwnerIds = ownerIds.filter((id) => id !== memberUid);
  await globalBoardRef(boardKey).update({
    ownerIds: updatedOwnerIds,
    ownerId: updatedOwnerIds[0],
  });
  return { ownerIds: updatedOwnerIds };
};

export const onceGetUserProfile = async (uid) => {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : null;
};

// Actualiza uid del miembro cuando hace login (llamar al iniciar sesión)
export const doClaimMembership = async (user) => {
  const authUser = user || getUser();
  if (!authUser?.uid || !authUser?.email) return;
  const { uid, email, displayName, photoURL } = authUser;

  try {
    const memberSnap = await db
      .collection("boards")
      .where("memberEmails", "array-contains", email)
      .get();

    const batch = db.batch();
    let hasChanges = false;

    memberSnap.forEach((doc) => {
      batch.set(
        db.collection("users").doc(uid).collection("boardRefs").doc(doc.id),
        { boardId: doc.id }
      );
      hasChanges = true;

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

    const ownerIdsSnap = await db
      .collection("boards")
      .where("ownerIds", "array-contains", uid)
      .get();

    const processOwnerBoard = (doc) => {
      const data = doc.data();
      batch.set(
        db.collection("users").doc(uid).collection("boardRefs").doc(doc.id),
        { boardId: doc.id }
      );
      hasChanges = true;
      const updates = {};
      if (!(data.memberEmails || []).includes(email)) {
        updates.memberEmails = [...(data.memberEmails || []), email];
      }
      if (!data.ownerIds?.length && data.ownerId) {
        updates.ownerIds = [data.ownerId];
      }
      if (Object.keys(updates).length) {
        batch.update(doc.ref, updates);
      }
    };

    ownerIdsSnap.forEach(processOwnerBoard);

    const ownerSnap = await db
      .collection("boards")
      .where("ownerId", "==", uid)
      .get();

    ownerSnap.forEach((doc) => {
      if (ownerIdsSnap.docs.some((d) => d.id === doc.id)) return;
      processOwnerBoard(doc);
    });

    if (hasChanges) await batch.commit();
  } catch (err) {
    console.error("Error en doClaimMembership:", err);
  }
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

export const doAddTareaAtStart = async (boardKey, listKey, tareaTitle) => {
  const ref = tareasColRef(boardKey, listKey);
  const snap = await ref.orderBy("index").get();

  const batch = db.batch();
  snap.forEach((doc) => {
    batch.update(doc.ref, { index: doc.data().index + 1 });
  });

  const docRef = ref.doc();
  batch.set(docRef, { title: tareaTitle, index: 0 });
  await batch.commit();

  return { key: docRef.id, title: tareaTitle, index: 0 };
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

// ─── HOME DASHBOARD ───────────────────────────────────────────────────────────

const mergeMember = (map, member) => {
  if (!member?.email) return;
  const existing = map.get(member.email);
  if (!existing) {
    map.set(member.email, {
      email: member.email,
      displayName: member.displayName || member.email,
      photoURL: member.photoURL || null,
      pendingCount: 0,
    });
    return;
  }
  if (!existing.photoURL && member.photoURL) existing.photoURL = member.photoURL;
  if (existing.displayName === existing.email && member.displayName) {
    existing.displayName = member.displayName;
  }
};

const incrementPending = (map, email) => {
  if (!email) return;
  if (!map.has(email)) {
    map.set(email, {
      email,
      displayName: email,
      photoURL: null,
      pendingCount: 1,
    });
    return;
  }
  map.get(email).pendingCount += 1;
};

export const onceGetHomeDashboard = async (boards, userEmail) => {
  const myPendingTareas = [];
  const memberMap = new Map();

  boards.forEach((board) => {
    (board.members || []).forEach((m) => mergeMember(memberMap, m));
  });

  for (const board of boards) {
    let lists = [];
    try {
      lists = await onceGetLists(board.key);
    } catch (err) {
      console.error(`Error loading lists for board ${board.key}:`, err);
      continue;
    }

    for (const list of lists) {
      let tareas = [];
      try {
        tareas = await onceGetTarea(board.key, list.key);
      } catch (err) {
        console.error(`Error loading tareas for list ${list.key}:`, err);
        continue;
      }

      for (const tarea of tareas) {
        const pending = !tarea.done && list.title?.trim().toLowerCase() !== "finalizado";

        if (pending && tarea.assigneeEmail) {
          incrementPending(memberMap, tarea.assigneeEmail);
          if (tarea.assigneeEmail === userEmail) {
            myPendingTareas.push({
              boardKey: board.key,
              boardTitle: board.title,
              listKey: list.key,
              listTitle: list.title,
              tareaKey: tarea.key,
              title: tarea.title || "Sin título",
            });
          }
        }

        (tarea.subtasks || []).forEach((sub) => {
          if (!sub.done && sub.assigneeEmail) {
            incrementPending(memberMap, sub.assigneeEmail);
            if (sub.assigneeEmail === userEmail) {
              myPendingTareas.push({
                boardKey: board.key,
                boardTitle: board.title,
                listKey: list.key,
                listTitle: list.title,
                tareaKey: tarea.key,
                subtaskId: sub.id,
                title: sub.title || "Sin título",
                isSubtask: true,
              });
            }
          }
        });
      }
    }
  }

  const membersWithPendingCounts = Array.from(memberMap.values()).sort(
    (a, b) => b.pendingCount - a.pendingCount || a.displayName.localeCompare(b.displayName)
  );

  return { myPendingTareas, membersWithPendingCounts };
};
