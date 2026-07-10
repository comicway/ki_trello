export const isFinalizadoList = (lists, listKey) => {
  const list = lists?.find((l) => l.key === listKey);
  return list?.title?.trim().toLowerCase() === "finalizado";
};

export const buildDoneUpdate = (nextDone, currentUser, existing = {}) => {
  if (nextDone) {
    return {
      done: true,
      doneAt: existing.doneAt || new Date().toISOString(),
      doneBy:
        existing.doneBy ||
        currentUser?.displayName ||
        currentUser?.email ||
        null,
    };
  }
  return { done: false, doneAt: null, doneBy: null };
};

export const isFinalizadoTitle = (title) =>
  title?.trim().toLowerCase() === "finalizado";

export const isPendingTarea = (tarea, listTitle) => {
  if (tarea?.done) return false;
  if (isFinalizadoTitle(listTitle)) return false;
  return true;
};
