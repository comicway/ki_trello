import { useEffect, useState } from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { getBoardKey } from "../../utils/index";
import { useHistory } from "react-router-dom";
import { db } from "../../firebase";
import List from "../../components/List";
import CreateList from "../../components/CreateList";
import Loader from "../../components/Loader";
import BoardTitle from "../../components/BoardTitle";

export default function Board() {
  const [lists, setLists] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [board, setBoard] = useState({});
  const [boardKey, setBoardKey] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const history = useHistory();

  useEffect(() => {
    setLoading(true);
    const bKey = getBoardKey();
    // Reclamar membresía si el usuario fue invitado por email
    db.doClaimMembership().catch(console.error);
    Promise.all([db.onceGetBoard(bKey), db.onceGetLists(bKey), db.onceGetMembers(bKey)])
      .then(([board, lists, members]) => {
        setLists(lists);
        setBoard(board || {});
        setMembers(members || []);
        setBoardKey(bKey);
        setLoading(false);
        setDataFetched(true);
      })
      .catch((error) => {
        setLoading(false);
        setDataFetched(false);
        console.error(error);
      });
  }, []);

  useEffect(() => {
    if (dataFetched) {
      console.log("Board data fetched");
    }
  }, [dataFetched]);

  const handleSetTareas = (listTareas) => {
    setTareas((prevState) => [...prevState, listTareas]);
  };

  const handleCreateList = (listTitle) => {
    db.doCreateList(boardKey, { title: listTitle }).then((res) => {
      const copiedLists = [...lists];
      const copiedTareas = [...tareas];
      copiedTareas.push({ listKey: res.key, tareas: [] });
      copiedLists.push(res);
      setLists(copiedLists);
      setTareas(copiedTareas);
    });
  };

  const handleCreateTarea = (params) => {
    const { listKey, tareaTitle } = params;
    db.doAddTarea(boardKey, listKey, tareaTitle)
      .then((newTarea) => {
        const tareasClone = [...tareas];
        let tareasIndex = tareasClone.findIndex((c) => c.listKey === listKey);
        if (tareasIndex !== -1) {
          tareasClone[tareasIndex] = {
            ...tareasClone[tareasIndex],
            tareas: [...tareasClone[tareasIndex].tareas, newTarea],
          };
        } else {
          tareasClone.push({ listKey, tareas: [newTarea] });
        }
        setTareas(tareasClone);
      })
      .catch(console.error);
  };

  const handleEditTarea = (params) => {
    const { listKey, tareaKey, tarea } = params;
    return db.doEditTarea(boardKey, listKey, tareaKey, tarea).then(() => {
      const updatedTareas = [...tareas];
      const listIndex = updatedTareas.findIndex((c) => c.listKey === listKey);
      const tareaIndex = updatedTareas[listIndex].tareas.findIndex(
        (c) => c.key === tareaKey
      );
      updatedTareas[listIndex].tareas[tareaIndex] = {
        ...updatedTareas[listIndex].tareas[tareaIndex],
        ...tarea,
      };
      setTareas(updatedTareas);
    });
  };

  const handleDeleteTarea = (params) => {
    const { listKey, tareaKey } = params;
    return db.doDeleteTarea(boardKey, listKey, tareaKey).then(() => {
      const tareasClone = [...tareas];
      const listIndex = tareasClone.findIndex((c) => c.listKey === listKey);
      tareasClone[listIndex].tareas = tareasClone[listIndex].tareas.filter(
        (c) => c.key !== tareaKey
      );
      setTareas(tareasClone);
    });
  };

  const handleMoveTareaManual = (tareaKey, oldListKey, newListKey) => {
    if (oldListKey === newListKey) return;
    const tareasClone = [...tareas];

    // Ensure all lists exist in tareasClone
    lists.forEach((list) => {
      if (!tareasClone.some((t) => t.listKey === list.key)) {
        tareasClone.push({ listKey: list.key, tareas: [] });
      }
    });

    const startIndex = tareasClone.findIndex((c) => c.listKey === oldListKey);
    const endIndex = tareasClone.findIndex((c) => c.listKey === newListKey);

    const startList = tareasClone[startIndex].tareas;
    const tareaIdx = startList.findIndex((t) => t.key === tareaKey);
    if (tareaIdx === -1) return;

    const [movedTarea] = startList.splice(tareaIdx, 1);
    tareasClone[endIndex].tareas.push(movedTarea);
    setTareas(tareasClone);

    db.doMoveTarea({
      boardKey,
      tareas: tareasClone[endIndex].tareas,
      newIndex: tareasClone[endIndex].tareas.length - 1,
      oldListKey,
      newListKey,
      tareaKey,
    });
  };

  const handleUpdateList = (listKey, title) => {
    return db.doUpdateList(boardKey, listKey, { title }).then(() => {
      const copiedLists = [...lists];
      const listIndex = copiedLists.findIndex((l) => l.key === listKey);
      copiedLists[listIndex] = { ...copiedLists[listIndex], title };
      setLists(copiedLists);
    });
  };

  const handleDeleteList = (listKey) => {
    db.doDeleteList(boardKey, listKey).then(() => {
      const copiedLists = lists.filter((l) => l.key !== listKey);
      setLists(copiedLists);
    });
  };

  const handleDeleteBoard = (bKey) => {
    return db.doDeleteBoard(bKey).then(() => {
      history.push("/boards");
    });
  };

  const handleUpdateBoard = (bKey, data) => {
    return db.doUpdateBoard(bKey, data).then(() => {
      setBoard({ ...board, ...data });
    });
  };

  const handleOnDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    const droppableIdStart = source.droppableId;
    const droppableIdEnd = destination.droppableId;
    const droppableIndexStart = source.index;
    const droppableIndexEnd = destination.index;

    if (type === "list") {
      const listsClone = [...lists];
      const pulledOutList = listsClone.splice(droppableIndexStart, 1);
      listsClone.splice(droppableIndexEnd, 0, ...pulledOutList);
      setLists(listsClone);
      db.onListMove({ boardKey, lists: listsClone });
    }

    if (type === "tarea") {
      if (droppableIdStart === droppableIdEnd) {
        const tareasClone = [...tareas];
        let tareasIndex = tareasClone.findIndex(
          (c) => c.listKey === droppableIdEnd
        );
        let listTareas = tareasClone[tareasIndex].tareas;
        const tarea = listTareas.splice(droppableIndexStart, 1);
        listTareas.splice(droppableIndexEnd, 0, ...tarea);
        setTareas(tareasClone);

        db.doMoveTarea({
          boardKey,
          tareas: tareasClone[tareasIndex].tareas,
          newIndex: droppableIndexEnd,
          oldListKey: droppableIdStart,
          newListKey: droppableIdEnd,
          tareaKey: draggableId,
        });
      }

      if (droppableIdStart !== droppableIdEnd) {
        const tareasClone = [...tareas];

        if (tareas.length !== lists.length) {
          const missingTareas = lists.filter(
            (list) => !tareasClone.some((tarea) => list.key === tarea.listKey)
          );
          missingTareas.forEach((list) => {
            tareasClone.push({ listKey: list.key, tareas: [] });
          });
          setTareas(tareasClone);
        }

        let startListIndex = tareasClone.findIndex(
          (c) => c.listKey === droppableIdStart
        );
        let endListIndex = tareasClone.findIndex(
          (c) => c.listKey === droppableIdEnd
        );
        let startList = tareasClone[startListIndex].tareas;
        let endList = tareasClone[endListIndex].tareas;

        const tarea = startList.splice(droppableIndexStart, 1);
        endList.splice(droppableIndexEnd, 0, ...tarea);
        setTareas(tareasClone);

        db.doMoveTarea({
          boardKey,
          tareas: tareasClone[endListIndex].tareas,
          newIndex: droppableIndexEnd,
          oldListKey: droppableIdStart,
          newListKey: droppableIdEnd,
          tareaKey: draggableId,
        });
      }
    }
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="flex flex-col h-full bg-dark-blue">
          <BoardTitle
            title={board.title}
            boardKey={boardKey}
            updateBoard={handleUpdateBoard}
            deleteBoard={handleDeleteBoard}
            onMembersUpdated={setMembers}
          />
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <div className="flex-1 overflow-auto whitespace-nowrap mb-2 pl-2 pr-1 flex">
              <Droppable
                droppableId="all-lists"
                direction="horizontal"
                type="list"
              >
                {(provided) => (
                  <div
                    className="mt-1 flex"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {lists?.map((list, index) => {
                      const listTareas = tareas.find(
                        (c) => c.listKey === list.key
                      );

                      return (
                        <div key={list.key} className="inline-block h-full">
                          <List
                            listKey={list.key}
                            listTitle={list.title}
                            boardKey={boardKey}
                            tareas={listTareas}
                            setTareas={handleSetTareas}
                            handleCreateTarea={handleCreateTarea}
                            handleEditTarea={handleEditTarea}
                            handleDeleteTarea={handleDeleteTarea}
                            handleMoveTareaManual={handleMoveTareaManual}
                            lists={lists}
                            members={members}
                            setDataFetched={setDataFetched}
                            index={index}
                            title={list.title}
                            handleUpdateList={handleUpdateList}
                            handleDeleteList={handleDeleteList}
                          />
                        </div>
                      );
                    })}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <div className="mt-1 h-full">
                <CreateList handleCreateList={handleCreateList} />
              </div>
            </div>
          </DragDropContext>
        </div>
      )}
    </>
  );
}
