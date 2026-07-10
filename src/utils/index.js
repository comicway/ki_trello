export function mergeDataWithKey(data) {
  if (!data) {
    return [];
  }
  return Object.values(data).map((value, index) => {
    return {
      ...value,
      key: Object.keys(data)[index],
    };
  });
}

export function getBoardKey(boardId) {
  if (boardId) return boardId;
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/");
  const bIndex = parts.indexOf("b");
  if (bIndex !== -1 && parts[bIndex + 1]) return parts[bIndex + 1];
  return "";
}

export function byPropKey(propertyName, value) {
  return {
    [propertyName]: value,
  };
}
