import { DragDropContext, Droppable } from "react-beautiful-dnd";
import TareaListItem from "../TareaListItem";
import CreateList from "../CreateList";
import { listKeyMatches } from "../../utils/tareasState";

export default function BoardListView({
  lists,
  tareas,
  boardKey,
  members,
  handleEditTarea,
  handleMoveTareaManual,
  handleCreateList,
  onDragEnd,
}) {
  const normalizedTareas = lists.map((list) => {
    const entry = tareas.find((t) => listKeyMatches(t.listKey, list.key));
    return entry?.tareas || [];
  });

  const hasAnyTarea = normalizedTareas.some((listTareas) => listTareas.length > 0);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 overflow-y-auto mx-4 my-2 pb-4">
        {lists.length === 0 && (
          <div className="flex items-center justify-center text-light-gray text-sm py-12">
            No hay listas en este board.
          </div>
        )}

        {lists.map((list, listIndex) => {
          const listTareas = normalizedTareas[listIndex] || [];

          return (
            <section key={list.key} className="mb-4">
              <div className="sticky top-0 z-10 px-4 py-2 bg-dark-blue border border-border-ki rounded-t-md">
                <h3 className="text-pearl-white font-semibold text-sm m-0">
                  {list.title}
                  <span className="text-light-gray font-normal ml-2">({listTareas.length})</span>
                </h3>
              </div>

              <Droppable droppableId={String(list.key)} type="tarea">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-b-md border border-t-0 border-border-ki bg-ki-black transition-colors ${
                      snapshot.isDraggingOver ? "bg-ki-purple/10 ring-1 ring-ki-purple/40" : ""
                    }`}
                    style={{ minHeight: listTareas.length === 0 ? 56 : undefined }}
                  >
                    {listTareas.length === 0 && (
                      <div
                        className={`text-light-gray text-xs text-center py-4 pointer-events-none select-none ${
                          snapshot.isDraggingOver ? "opacity-0" : "opacity-100"
                        }`}
                      >
                        Arrastra tareas aquí
                      </div>
                    )}
                    {listTareas.map((tarea, index) => (
                      <TareaListItem
                        key={tarea.key}
                        index={index}
                        tarea={tarea}
                        listKey={list.key}
                        boardKey={boardKey}
                        lists={lists}
                        members={members}
                        handleEditTarea={handleEditTarea}
                        handleMoveTareaManual={handleMoveTareaManual}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </section>
          );
        })}

        {!hasAnyTarea && lists.length > 0 && (
          <p className="text-light-gray text-xs text-center py-2">
            No hay tareas. Usa &quot;+ Agregar Tarea&quot; para crear una.
          </p>
        )}

        <div className="mt-2">
          <CreateList handleCreateList={handleCreateList} vertical />
        </div>
      </div>
    </DragDropContext>
  );
}
