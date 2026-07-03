import { db } from "./firebase";
import { getUser } from "./user";

// ─── BOARDS ──────────────────────────────────────────────────────────────────

export const doCreateBoard = async (board) => {
  const uid = getUser().uid;
  const ref = await db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .add(board);
  return { ...board, key: ref.id };
};

export const doDeleteBoard = async (boardKey) => {
  const uid = getUser().uid;
  const listsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .collection("lists")
    .get();

  const deletions = [];
  listsSnap.forEach((listDoc) => {
    deletions.push(doDeleteList(boardKey, listDoc.id));
  });
  await Promise.all(deletions);

  return db.collection("users").doc(uid).collection("boards").doc(boardKey).delete();
};

export const doUpdateBoard = async (boardKey, data) => {
  const uid = getUser().uid;
  await db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .update(data);
};

export const onceGetBoards = async () => {
  const uid = getUser().uid;
  const snap = await db.collection("users").doc(uid).collection("boards").get();
  const boards = [];
  snap.forEach((doc) => boards.push({ key: doc.id, ...doc.data() }));
  return boards;
};

export const onceGetBoard = async (boardKey) => {
  const uid = getUser().uid;
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .get();
  return snap.exists ? { key: snap.id, ...snap.data() } : null;
};

// ─── LISTS ───────────────────────────────────────────────────────────────────

export const onceGetLists = async (boardKey) => {
  const uid = getUser().uid;
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .collection("lists")
    .orderBy("index")
    .get();
  const lists = [];
  snap.forEach((doc) => lists.push({ key: doc.id, ...doc.data() }));
  return lists;
};

export const doCreateList = async (boardKey, list) => {
  const uid = getUser().uid;
  const listsRef = db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .collection("lists");

  const snap = await listsRef.get();
  const index = snap.size;

  const ref = await listsRef.add({ ...list, index });
  return { ...list, key: ref.id, index };
};

export const doDeleteList = async (boardKey, listKey) => {
  const uid = getUser().uid;
  const cardsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .collection("lists")
    .doc(listKey)
    .collection("cards")
    .get();

  const batch = db.batch();
  cardsSnap.forEach((doc) => batch.delete(doc.ref));
  batch.delete(
    db
      .collection("users")
      .doc(uid)
      .collection("boards")
      .doc(boardKey)
      .collection("lists")
      .doc(listKey)
  );
  return batch.commit();
};

export const doUpdateList = async (boardKey, listKey, data) => {
  const uid = getUser().uid;
  await db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .collection("lists")
    .doc(listKey)
    .update(data);
  return data;
};

export const onListMove = async (params) => {
  const { boardKey, lists } = params;
  const uid = getUser().uid;
  const batch = db.batch();
  lists.forEach((list, index) => {
    const ref = db
      .collection("users")
      .doc(uid)
      .collection("boards")
      .doc(boardKey)
      .collection("lists")
      .doc(list.key);
    batch.update(ref, { index });
  });
  return batch.commit();
};

// ─── CARDS ───────────────────────────────────────────────────────────────────

const cardsColRef = (boardKey, listKey) => {
  const uid = getUser().uid;
  return db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .collection("lists")
    .doc(listKey)
    .collection("cards");
};

export const onceGetCard = async (boardKey, listKey) => {
  const snap = await cardsColRef(boardKey, listKey).orderBy("index").get();
  const cards = [];
  snap.forEach((doc) => cards.push({ key: doc.id, ...doc.data() }));
  return cards;
};

export const doAddCard = async (boardKey, listKey, cardTitle) => {
  const ref = cardsColRef(boardKey, listKey);
  const snap = await ref.get();
  const index = snap.size;
  const docRef = await ref.add({ title: cardTitle, index });
  return { key: docRef.id, title: cardTitle, index };
};

export const doEditCard = async (boardKey, listKey, cardKey, card) => {
  await cardsColRef(boardKey, listKey).doc(cardKey).update(card);
  return { ...card, key: cardKey };
};

export const doDeleteCard = async (boardKey, listKey, cardKey) => {
  return cardsColRef(boardKey, listKey).doc(cardKey).delete();
};

export const doMoveCard = async (params) => {
  const { boardKey, oldListKey, newListKey, cardKey, cards } = params;
  const uid = getUser().uid;
  const batch = db.batch();

  const oldCardRef = db
    .collection("users")
    .doc(uid)
    .collection("boards")
    .doc(boardKey)
    .collection("lists")
    .doc(oldListKey)
    .collection("cards")
    .doc(cardKey);

  const oldCardSnap = await oldCardRef.get();
  const cardData = oldCardSnap.data();

  batch.delete(oldCardRef);

  const newListCardsRef = cardsColRef(boardKey, newListKey);
  cards.forEach((card, index) => {
    const ref =
      card.key === cardKey
        ? newListCardsRef.doc(cardKey)
        : newListCardsRef.doc(card.key);
    batch.set(
      ref,
      { ...(card.key === cardKey ? cardData : card), index },
      { merge: true }
    );
  });

  await batch.commit();
  return onceGetCard(boardKey, newListKey);
};
