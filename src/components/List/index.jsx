import { useState, useEffect } from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { db } from "../../firebase";
import CreateTarea from "../CreateTarea";
import ListHeader from "./ListHeader";
import Tarea from "../Tarea";

export default function List(props) {
  const [creatingTarea, setCreatingTarea] = useState(false);

  const {
    tareas,
    setTareas,
    listTitle,
    listKey,
    boardKey,
    handleCreateTarea,
    handleEditTarea,
    handleDeleteTarea,
    handleMoveTareaManual,
    lists,
    members,
    handleUpdateList,
    handleDeleteList,
    index,
    focusTareaKey,
    onFocusConsumed,
  } = props;

  const tareaCount = tareas?.tareas?.length || 0;

  useEffect(() => {
    if (!boardKey || !listKey) return;
    db.onceGetTarea(boardKey, listKey).then((tareaArray) => {
      if (tareaArray && tareaArray.length > 0) {
        const data = {
          listKey,
          tareas: tareaArray,
        };
        setTareas(data);
      }
    });
  }, [boardKey, listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreatingTarea = () => {
    setCreatingTarea(!creatingTarea);
  };

  return (
    <Draggable key={listKey} draggableId={String(listKey)} index={index}>
      {(provided) => (
        <div
          className="w-[292px] mx-1 py-4 box-border inline-block align-top whitespace-nowrap bg-ki-black border border-border-ki rounded-md"
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          <ListHeader
            title={listTitle}
            listKey={listKey}
            tareaCount={tareaCount}
            handleUpdateList={handleUpdateList}
            handleDeleteList={handleDeleteList}
          />
          <div className="rounded box-border flex flex-col max-h-full relative whitespace-normal">
            <div className="px-4 flex-auto mb-0 overflow-y-auto overflow-x-hidden z-[1] min-h-0">
              <Droppable droppableId={String(listKey)} type="tarea">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {tareas &&
                      tareas.tareas?.map((tarea, index) => (
                        <Tarea
                          key={tarea.key}
                          index={index}
                          tareaKey={tarea.key}
                          title={tarea.title}
                          description={tarea.description ? tarea.description : ""}
                          dueDate={tarea.dueDate || null}
                          assigneeEmail={tarea.assigneeEmail || null}
                          subtasks={tarea.subtasks || []}
                          done={tarea.done || false}
                          doneAt={tarea.doneAt || null}
                          doneBy={tarea.doneBy || null}
                          readyForSalesforce={tarea.readyForSalesforce || false}
                          listKey={listKey}
                          boardKey={boardKey}
                          lists={lists}
                          members={members}
                          handleEditTarea={handleEditTarea}
                          handleDeleteTarea={handleDeleteTarea}
                          handleMoveTareaManual={handleMoveTareaManual}
                          autoFocus={focusTareaKey === tarea.key}
                          onAutoFocusConsumed={onFocusConsumed}
                        />
                      ))}
                    {provided.placeholder}
                    <CreateTarea
                      listKey={listKey}
                      creatingTarea={creatingTarea}
                      handleCreatingTarea={handleCreatingTarea}
                      handleCreateTarea={handleCreateTarea}
                    />
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
