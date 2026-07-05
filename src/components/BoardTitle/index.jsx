import { useState, useEffect, useContext } from "react";
import AddMemberModal from "../AddMemberModal";
import DeleteBoardModal from "../DeleteBoardModal";
import MemberAvatar from "../MemberAvatar";
import { UserContext } from "../../providers/UserProvider";
import { inputClass } from "../ui/styles";
import { UserAddIcon, DeleteIcon } from "../ui/icons";

const MAX_VISIBLE_MEMBERS = 5;

export default function BoardTitle(props) {
  const [boardTitle, setBoardTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const currentUser = useContext(UserContext);

  useEffect(() => {
    setBoardTitle(title);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e) => {
    e.preventDefault();
    setBoardTitle(e.target.value);
  };

  const handleEnableEdit = () => {
    setEditing(true);
    setBoardTitle(title);
  };

  const handleDisableEdit = () => {
    setEditing(false);
    setBoardTitle("");
  };

  const handleFormSubmit = (event, callback, boardKey, boardTitle) => {
    event.preventDefault();
    if (boardTitle !== "") {
      callback(boardKey, { title: boardTitle }).then(() => {
        setBoardTitle("");
        setEditing(false);
      });
    }
  };

  const {
    title,
    boardKey,
    updateBoard,
    deleteBoard,
    onMembersUpdated,
    onOwnersUpdated,
    members,
    onQuickAddTarea,
    ownerIds = [],
  } = props;

  const visibleMembers = members?.slice(0, MAX_VISIBLE_MEMBERS) || [];
  const extraMembers = (members?.length || 0) - MAX_VISIBLE_MEMBERS;
  const isCurrentUserOwner = currentUser?.uid && ownerIds.includes(currentUser.uid);

  return (
    <>
      <div className="flex justify-between px-4 py-2 bg-dark-blue overflow-hidden border-b border-border-ki">
        <div className="flex-grow flex items-center gap-2 min-w-0">
          {editing ? (
            <form
              onSubmit={(event) => {
                handleFormSubmit(event, updateBoard, boardKey, boardTitle);
              }}
              onBlur={handleDisableEdit}
            >
              <input
                value={boardTitle}
                onChange={handleInputChange}
                autoFocus
                className={`${inputClass} max-w-[200px] text-lg font-medium`}
              />
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={handleEnableEdit}
                className="bg-transparent border-none text-pearl-white hover:bg-ki-black hover:text-ki-orange h-[38px] font-medium text-lg px-3 transition-colors cursor-pointer"
              >
                <span className="max-w-[40vw] overflow-hidden text-ellipsis whitespace-nowrap block">
                  {title}
                </span>
              </button>
              <button
                type="button"
                onClick={onQuickAddTarea}
                className="border-none text-pearl-white h-[38px] font-medium text-sm px-3 transition-colors flex items-center gap-1 flex-shrink-0 hover:opacity-90 bg-ki-purple rounded cursor-pointer"
              >
                + Agregar Tarea
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {visibleMembers.length > 0 && (
            <div className="flex items-center -space-x-2 mr-1">
              {visibleMembers.map((member, i) => (
                <span key={member.email || i} title={member.displayName || member.email} className="inline-block">
                  <MemberAvatar member={member} size={32} />
                </span>
              ))}
              {extraMembers > 0 && (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ki-black border-2 border-dark-blue text-pearl-white text-xs flex-shrink-0">
                  +{extraMembers}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setMemberModalOpen(true)}
            className="inline-flex items-center gap-1 px-3 h-[38px] bg-transparent border border-border-ki text-light-gray hover:bg-ki-black hover:text-pearl-white hover:border-ki-purple transition-colors cursor-pointer rounded"
          >
            <UserAddIcon className="h-4 w-4" />
            Agregar miembro
          </button>

          {isCurrentUserOwner && (
            <button
              type="button"
              title="Eliminar board"
              aria-label="Eliminar board"
              onClick={() => setDeleteModalOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-border-ki text-light-gray hover:text-alert-danger hover:border-alert-danger bg-transparent cursor-pointer transition-colors flex-shrink-0"
            >
              <DeleteIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <AddMemberModal
        visible={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        boardKey={boardKey}
        ownerIds={ownerIds}
        onMembersUpdated={onMembersUpdated}
        onOwnersUpdated={onOwnersUpdated}
      />

      <DeleteBoardModal
        visible={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        boardTitle={title}
        onConfirm={() => deleteBoard(boardKey)}
      />
    </>
  );
}
