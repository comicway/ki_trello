import { useState, useEffect } from "react";
import { Button, Menu, Dropdown, Input } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import AddMemberModal from "../AddMemberModal";

export default function BoardTitle(props) {
  const [boardTitle, setBoardTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

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

  const { title, boardKey, updateBoard, deleteBoard, onMembersUpdated } = props;

  return (
    <>
      <div className="flex justify-between px-4 py-2 bg-dark-blue overflow-hidden border-b border-border-ki">
        <div className="flex-grow">
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
            <Button
              onClick={handleEnableEdit}
              className="bg-transparent border-none text-pearl-white hover:bg-ki-black hover:text-ki-orange shadow-none h-[38px] font-medium text-lg px-3 transition-colors"
            >
              <span className="max-w-[50vw] overflow-hidden text-ellipsis whitespace-nowrap block">
                {title}
              </span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Agregar Miembro */}
          <Button
            onClick={() => setMemberModalOpen(true)}
            icon={<UserAddOutlined />}
            className="bg-transparent border border-border-ki text-light-gray hover:bg-ki-black hover:text-pearl-white hover:border-ki-purple shadow-none h-[38px] transition-colors flex items-center gap-1 px-3"
          >
            Agregar miembro
          </Button>

          {/* Show Menu Dropdown */}
          <Dropdown
            overlay={
              <Menu className="bg-ki-black border border-border-ki text-pearl-white">
                <Menu.Item
                  key="0"
                  onClick={() => deleteBoard(boardKey)}
                  className="hover:bg-alert-danger hover:text-pearl-white"
                >
                  Delete board
                </Menu.Item>
              </Menu>
            }
            trigger={["click"]}
          >
            <Button className="bg-transparent border-none text-light-gray hover:bg-ki-black hover:text-pearl-white shadow-none h-[38px] transition-colors">
              Show Menu
            </Button>
          </Dropdown>
        </div>
      </div>

      <AddMemberModal
        visible={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        boardKey={boardKey}
        onMembersUpdated={onMembersUpdated}
      />
    </>
  );
}
