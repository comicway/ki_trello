export const listKeyMatches = (a, b) => String(a) === String(b);

export const ensureTareasForLists = (lists, tareas) => {
  const clone = lists.map((list) => {
    const existing = tareas.find((entry) => listKeyMatches(entry.listKey, list.key));
    return existing
      ? { listKey: list.key, tareas: [...(existing.tareas || [])] }
      : { listKey: list.key, tareas: [] };
  });
  return clone;
};

export const getListTareasIndex = (tareasClone, listKey) =>
  tareasClone.findIndex((entry) => listKeyMatches(entry.listKey, listKey));
