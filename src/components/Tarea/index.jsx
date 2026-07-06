import { useState, useEffect, useContext } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Button, Input } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import TareaModal from "../TareaModal";
import DoneToggle from "../DoneToggle";
import { UserContext } from "../../providers/UserProvider";
import { buildDoneUpdate } from "../../utils/completion";

export default function Tarea(props) {
  const [showModal, setShowModal] = useState(false);
  const [showIcons, setShowIcons] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tareaTitle, setTareaTitle] = useState("");
  const currentUser = useContext(UserContext);

  const {
    index,
    title,
    description,
    dueDate,
    country,
    assigneeEmail,
    subtasks,
    done,
    doneAt,
    doneBy,
    readyForSalesforce,
    tareaKey,
    listKey,
    boardKey,
    lists,
    members,
    handleEditTarea,
    handleDeleteTarea,
    handleMoveTareaManual,
    autoFocus,
    onAutoFocusConsumed,
  } = props;

  useEffect(() => { setTareaTitle(title); }, [title]);

  useEffect(() => {
    if (autoFocus) {
      setEditing(true);
      onAutoFocusConsumed?.();
    }
  }, [autoFocus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleChange = (e) => setTareaTitle(e.target.value);
  const handleShowIcons = () => setShowIcons(true);
  const handleHideIcons = () => setShowIcons(false);
  const handleEnableEditing = () => setEditing(true);
  const handleDisableEditing = () => setEditing(false);
  const handleShowModal = () => setShowModal(true);
  const handleHideModal = () => setShowModal(false);

  const handleToggleDone = () => {
    const update = buildDoneUpdate(!done, currentUser, { doneAt, doneBy });
    handleEditTarea({ listKey, tareaKey, tarea: update });
  };

  const handleSubmitForm = (event) => {
    event.preventDefault();
    handleEditTarea({ listKey, tareaKey, tarea: { title: tareaTitle } }).then(
      () => setEditing(false)
    );
  };

  const onDeleteTarea = () => handleDeleteTarea({ listKey, tareaKey });

  return (
    <>
      <Draggable draggableId={String(tareaKey)} index={index}>
        {(provided) => (
          <div
            className={`mb-3 rounded-md border cursor-pointer transition-colors ${
              done
                ? "bg-ki-black border-border-ki opacity-60"
                : "bg-dark-blue border-border-ki"
            }`}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            ref={provided.innerRef}
            onMouseEnter={handleShowIcons}
            onMouseLeave={handleHideIcons}
            onBlur={handleDisableEditing}
          >
            <div className="relative font-medium px-3 py-3 text-pearl-white">
              {editing ? (
                <form onSubmit={handleSubmitForm}>
                  <Input
                    className="bg-ki-black text-pearl-white border-border-ki"
                    value={tareaTitle}
                    onChange={handleTitleChange}
                    autoFocus
                  />
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <DoneToggle done={!!done} onClick={handleToggleDone} />
                  <div
                    className={`flex-1 min-w-0 truncate ${done ? "line-through text-light-gray" : ""}`}
                    onClick={handleShowModal}
                  >
                    {title}
                  </div>
                  {showIcons && (
                    <div
                      className="flex gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        onClick={handleEnableEditing}
                        icon={<EditOutlined />}
                        className="bg-transparent border-none text-light-gray hover:bg-ki-black hover:text-pearl-white flex items-center justify-center p-1"
                      />
                      <Button
                        onClick={onDeleteTarea}
                        icon={<DeleteOutlined />}
                        className="bg-transparent border-none text-light-gray hover:bg-ki-black hover:text-pearl-white flex items-center justify-center p-1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
      <TareaModal
        visible={showModal}
        tareaTitle={tareaTitle}
        tareaDescription={description}
        tareaDueDate={dueDate}
        tareaCountry={country}
        tareaAssigneeEmail={assigneeEmail}
        tareaSubtasks={subtasks}
        tareaDone={!!done}
        tareaDoneAt={doneAt}
        tareaDoneBy={doneBy}
        tareaReadyForSalesforce={!!readyForSalesforce}
        tareaKey={tareaKey}
        listKey={listKey}
        boardKey={boardKey}
        lists={lists}
        members={members}
        handleEditTarea={handleEditTarea}
        handleHideModal={handleHideModal}
        handleMoveTareaManual={handleMoveTareaManual}
      />
    </>
  );
}
