import { useState, useEffect, useContext } from "react";
import { Button, Input, Avatar, Tooltip } from "antd";
import { UserAddOutlined, DeleteOutlined } from "@ant-design/icons";
import AddMemberModal from "../AddMemberModal";
import DeleteBoardModal from "../DeleteBoardModal";
import MemberAvatar from "../MemberAvatar";
import { UserContext } from "../../providers/UserProvider";

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
              <Input
                value={boardTitle}
                onChange={handleInputChange}
                autoFocus
                className="max-w-[200px] text-lg font-medium bg-ki-black text-pearl-white border-border-ki"
              />
            </form>
          ) : (
            <>
              <Button
                onClick={handleEnableEdit}
                className="bg-transparent border-none text-pearl-white hover:bg-ki-black hover:text-ki-orange shadow-none h-[38px] font-medium text-lg px-3 transition-colors"
              >
                <span className="max-w-[40vw] overflow-hidden text-ellipsis whitespace-nowrap block">
                  {title}
                </span>
              </Button>
              <Button
                onClick={onQuickAddTarea}
                className="border-none text-pearl-white shadow-none h-[38px] font-medium text-sm px-3 transition-colors flex items-center gap-1 flex-shrink-0 hover:opacity-90"
                style={{ backgroundColor: "#731AF2" }}
              >
                + Agregar Tarea
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {visibleMembers.length > 0 && (
            <div className="flex items-center -space-x-2 mr-1">
              {visibleMembers.map((member, i) => (
                <Tooltip key={member.email || i} title={member.displayName || member.email}>
                  <span className="inline-block">
                    <MemberAvatar member={member} size={32} />
                  </span>
                </Tooltip>
              ))}
              {extraMembers > 0 && (
                <Avatar
                  size={32}
                  className="bg-ki-black border-2 border-dark-blue text-pearl-white text-xs flex-shrink-0"
                >
                  +{extraMembers}
                </Avatar>
              )}
            </div>
          )}
          {/* Botón Agregar Miembro */}
          <Button
            onClick={() => setMemberModalOpen(true)}
            icon={<UserAddOutlined />}
            className="bg-transparent border border-border-ki text-light-gray hover:bg-ki-black hover:text-pearl-white hover:border-ki-purple shadow-none h-[38px] transition-colors flex items-center gap-1 px-3"
          >
            Agregar miembro
          </Button>

          {isCurrentUserOwner && (
            <button
              type="button"
              title="Eliminar board"
              aria-label="Eliminar board"
              onClick={() => setDeleteModalOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-border-ki text-light-gray hover:text-alert-danger hover:border-alert-danger bg-transparent cursor-pointer transition-colors flex-shrink-0"
            >
              <DeleteOutlined />
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
