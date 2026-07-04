export const getOwnerIds = (board) => {
  if (board?.ownerIds?.length) return board.ownerIds;
  if (board?.ownerId) return [board.ownerId];
  return [];
};

export const isBoardOwnerUser = (board, uid) =>
  uid && getOwnerIds(board).includes(uid);

export const isMemberOwner = (member, ownerIds) =>
  member?.uid && ownerIds.includes(member.uid);
