import { useEffect, useState, useMemo, useContext } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { getBoardKey } from "../../utils/index";
import { useRouter } from "next/navigation";
import { db } from "../../firebase";
import List from "../../components/List";
import CreateList from "../../components/CreateList";
import Loader from "../../components/Loader";
import BoardTitle from "../../components/BoardTitle";
import BoardListView from "../../components/BoardListView";
import CountryFilterButton, { viewTabButtonClass } from "../../components/CountryFilterButton";
import { getOwnerIds } from "../../utils/boardRoles";
import { ensureTareasForLists, getListTareasIndex } from "../../utils/tareasState";
import { filterTareasByCountry } from "../../utils/tareaCountryFilter";
import { UserContext } from "../../providers/UserProvider";

const VIEW_MODES = { BOARD: "board", LIST: "list" };

export default function Board({ boardId }) {
  const [lists, setLists] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [board, setBoard] = useState({});
  const [boardKey, setBoardKey] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [focusTareaKey, setFocusTareaKey] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODES.BOARD);
  const [countryFilter, setCountryFilter] = useState(null);
  const router = useRouter();
  const currentUser = useContext(UserContext);

  useEffect(() => {
    setLoading(true);
    const bKey = getBoardKey(boardId);
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
  }, [boardId]);

  useEffect(() => {
    if (dataFetched) {
      console.log("Board data fetched");
    }
  }, [dataFetched]);

  const listKeysSignature = useMemo(
    () => lists.map((list) => list.key).join("|"),
    [lists]
  );

  useEffect(() => {
    if (viewMode !== VIEW_MODES.LIST || !boardKey || lists.length === 0) return;

    let cancelled = false;
    Promise.all(lists.map((list) => db.onceGetTarea(boardKey, list.key)))
      .then((results) => {
        if (cancelled) return;
        setTareas(
          lists.map((list, i) => ({
            listKey: list.key,
            tareas: results[i] || [],
          }))
        );
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [viewMode, boardKey, listKeysSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTareas = useMemo(
    () => filterTareasByCountry(tareas, countryFilter),
    [tareas, countryFilter]
  );

  const handleQuickAddTarea = () => {
    if (lists.length === 0) return;
    const firstListKey = lists[0].key;
    db.doAddTareaAtStart(boardKey, firstListKey, "")
      .then((newTarea) => {
        const tareasClone = [...tareas];
        const listIndex = tareasClone.findIndex((c) => c.listKey === firstListKey);
        if (listIndex !== -1) {
          const existing = tareasClone[listIndex].tareas || [];
          tareasClone[listIndex] = {
            ...tareasClone[listIndex],
            tareas: [newTarea, ...existing.map((t) => ({ ...t, index: t.index + 1 }))],
          };
        } else {
          tareasClone.push({ listKey: firstListKey, tareas: [newTarea] });
        }
        setTareas(tareasClone);
        setFocusTareaKey(newTarea.key);
      })
      .catch(console.error);
  };

  const handleSetTareas = (listTareas) => {
    setTareas((prevState) => [...prevState, listTareas]);
  };

  const handleCreateList = (listTitle) => {
    db.doCreateList(boardKey, { title: listTitle }).then((res) => {
      const copiedLists = [...lists, res];
      const copiedTareas = ensureTareasForLists(copiedLists, [
        ...tareas,
        { listKey: res.key, tareas: [] },
      ]);
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
    const listIndex = tareas.findIndex((c) => c.listKey === listKey);

    return db.doEditTarea(boardKey, listKey, tareaKey, tarea).then(() => {
      if (listIndex === -1) return;

      const updatedTareas = [...tareas];
      const tareaIndex = updatedTareas[listIndex].tareas.findIndex(
        (c) => c.key === tareaKey
      );
      if (tareaIndex === -1) return;

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

  const buildMoveMeta = (oldListKey, newListKey) => {
    if (oldListKey === newListKey) return {};
    const fromList = lists.find((l) => l.key === oldListKey);
    const toList = lists.find((l) => l.key === newListKey);
    return {
      changedBy: currentUser?.displayName || currentUser?.email || null,
      fromListTitle: fromList?.title || "—",
      toListTitle: toList?.title || "—",
    };
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
      ...buildMoveMeta(oldListKey, newListKey),
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
      router.push("/boards");
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
      return;
    }

    if (type !== "tarea") return;

    const tareasClone = ensureTareasForLists(lists, tareas);
    const startIndex = getListTareasIndex(tareasClone, droppableIdStart);
    const endIndex = getListTareasIndex(tareasClone, droppableIdEnd);
    if (startIndex === -1 || endIndex === -1) return;

    const startList = [...tareasClone[startIndex].tareas];
    const [movedTarea] = startList.splice(droppableIndexStart, 1);
    if (!movedTarea) return;

    if (droppableIdStart === droppableIdEnd) {
      startList.splice(droppableIndexEnd, 0, movedTarea);
      tareasClone[startIndex] = { ...tareasClone[startIndex], tareas: startList };
      setTareas(tareasClone);

      db.doMoveTarea({
        boardKey,
        tareas: startList,
        newIndex: droppableIndexEnd,
        oldListKey: droppableIdStart,
        newListKey: droppableIdEnd,
        tareaKey: draggableId,
        ...buildMoveMeta(droppableIdStart, droppableIdEnd),
      });
      return;
    }

    const endList = [...tareasClone[endIndex].tareas];
    endList.splice(droppableIndexEnd, 0, movedTarea);
    tareasClone[startIndex] = { ...tareasClone[startIndex], tareas: startList };
    tareasClone[endIndex] = { ...tareasClone[endIndex], tareas: endList };
    setTareas(tareasClone);

    db.doMoveTarea({
      boardKey,
      tareas: endList,
      newIndex: droppableIndexEnd,
      oldListKey: droppableIdStart,
      newListKey: droppableIdEnd,
      tareaKey: draggableId,
      ...buildMoveMeta(droppableIdStart, droppableIdEnd),
    });
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
            members={members}
            updateBoard={handleUpdateBoard}
            deleteBoard={handleDeleteBoard}
            onMembersUpdated={setMembers}
            onOwnersUpdated={(newOwnerIds) =>
              setBoard((b) => ({
                ...b,
                ownerIds: newOwnerIds,
                ownerId: newOwnerIds[0],
              }))
            }
            onQuickAddTarea={handleQuickAddTarea}
            ownerIds={getOwnerIds(board)}
          />

          <div className="flex items-center gap-1 px-4 py-2 bg-dark-blue border-b border-border-ki">
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.LIST)}
              className={viewTabButtonClass(viewMode === VIEW_MODES.LIST)}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.BOARD)}
              className={viewTabButtonClass(viewMode === VIEW_MODES.BOARD)}
            >
              Tablero
            </button>
            <CountryFilterButton value={countryFilter} onChange={setCountryFilter} />
          </div>

          <DragDropContext onDragEnd={handleOnDragEnd} key={viewMode}>
          {viewMode === VIEW_MODES.LIST ? (
            <BoardListView
              lists={lists}
              tareas={filteredTareas}
              boardKey={boardKey}
              members={members}
              handleEditTarea={handleEditTarea}
              handleMoveTareaManual={handleMoveTareaManual}
              handleCreateList={handleCreateList}
            />
          ) : (
          <div className="flex-1 overflow-auto whitespace-nowrap mb-2 pl-2 pr-1 flex">
              <Droppable
                droppableId="all-lists"
                direction="horizontal"
                type="list"
                isDropDisabled={false}
                isCombineEnabled={false}
                ignoreContainerClipping={false}
              >
                {(provided) => (
                  <div
                    className="mt-1 flex"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {lists?.map((list, index) => {
                      const listTareas = filteredTareas.find(
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
                            index={index}
                            title={list.title}
                            handleUpdateList={handleUpdateList}
                            handleDeleteList={handleDeleteList}
                            focusTareaKey={focusTareaKey}
                            onFocusConsumed={() => setFocusTareaKey(null)}
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
          )}
          </DragDropContext>
        </div>
      )}
    </>
  );
}
