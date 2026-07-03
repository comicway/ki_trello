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
  const [cards, setCards] = useState([]);
  const [board, setBoard] = useState({});
  const [boardKey, setBoardKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const history = useHistory();

  useEffect(() => {
    setLoading(true);
    const bKey = getBoardKey();
    Promise.all([db.onceGetBoard(bKey), db.onceGetLists(bKey)])
      .then(([board, lists]) => {
        setLists(lists); // already sorted by index from Firestore query
        setBoard(board || {});
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

  const handleSetCards = (listCards) => {
    setCards((prevState) => [...prevState, listCards]);
  };

  const handleCreateList = (listTitle) => {
    db.doCreateList(boardKey, { title: listTitle }).then((res) => {
      const copiedLists = [...lists];
      const copiedCards = [...cards];
      copiedCards.push({ listKey: res.key, cards: [] });
      copiedLists.push(res);
      setLists(copiedLists);
      setCards(copiedCards);
    });
  };

  const handleCreateCard = (params) => {
    const { listKey, cardTitle } = params;
    db.doAddCard(boardKey, listKey, cardTitle)
      .then((newCard) => {
        const cardsClone = [...cards];
        let cardsIndex = cardsClone.findIndex((c) => c.listKey === listKey);
        if (cardsIndex !== -1) {
          cardsClone[cardsIndex] = {
            ...cardsClone[cardsIndex],
            cards: [...cardsClone[cardsIndex].cards, newCard],
          };
        } else {
          cardsClone.push({ listKey, cards: [newCard] });
        }
        setCards(cardsClone);
      })
      .catch(console.error);
  };

  const handleEditCard = (params) => {
    const { listKey, cardKey, card } = params;
    return db.doEditCard(boardKey, listKey, cardKey, card).then(() => {
      const updatedCards = [...cards];
      const listIndex = updatedCards.findIndex((c) => c.listKey === listKey);
      const cardIndex = updatedCards[listIndex].cards.findIndex(
        (c) => c.key === cardKey
      );
      updatedCards[listIndex].cards[cardIndex] = {
        ...updatedCards[listIndex].cards[cardIndex],
        ...card,
      };
      setCards(updatedCards);
    });
  };

  const handleDeleteCard = (params) => {
    const { listKey, cardKey } = params;
    return db.doDeleteCard(boardKey, listKey, cardKey).then(() => {
      const cardsClone = [...cards];
      const listIndex = cardsClone.findIndex((c) => c.listKey === listKey);
      cardsClone[listIndex].cards = cardsClone[listIndex].cards.filter(
        (c) => c.key !== cardKey
      );
      setCards(cardsClone);
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

    if (type === "card") {
      if (droppableIdStart === droppableIdEnd) {
        const cardsClone = [...cards];
        let cardsIndex = cardsClone.findIndex(
          (c) => c.listKey === droppableIdEnd
        );
        let listCards = cardsClone[cardsIndex].cards;
        const card = listCards.splice(droppableIndexStart, 1);
        listCards.splice(droppableIndexEnd, 0, ...card);
        setCards(cardsClone);

        db.doMoveCard({
          boardKey,
          cards: cardsClone[cardsIndex].cards,
          newIndex: droppableIndexEnd,
          oldListKey: droppableIdStart,
          newListKey: droppableIdEnd,
          cardKey: draggableId,
        });
      }

      if (droppableIdStart !== droppableIdEnd) {
        const cardsClone = [...cards];

        if (cards.length !== lists.length) {
          const missingCards = lists.filter(
            (list) => !cardsClone.some((card) => list.key === card.listKey)
          );
          missingCards.forEach((list) => {
            cardsClone.push({ listKey: list.key, cards: [] });
          });
          setCards(cardsClone);
        }

        let startListIndex = cardsClone.findIndex(
          (c) => c.listKey === droppableIdStart
        );
        let endListIndex = cardsClone.findIndex(
          (c) => c.listKey === droppableIdEnd
        );
        let startList = cardsClone[startListIndex].cards;
        let endList = cardsClone[endListIndex].cards;

        const card = startList.splice(droppableIndexStart, 1);
        endList.splice(droppableIndexEnd, 0, ...card);
        setCards(cardsClone);

        db.doMoveCard({
          boardKey,
          cards: cardsClone[endListIndex].cards,
          newIndex: droppableIndexEnd,
          oldListKey: droppableIdStart,
          newListKey: droppableIdEnd,
          cardKey: draggableId,
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
                      const listCards = cards.find(
                        (c) => c.listKey === list.key
                      );

                      return (
                        <div key={list.key} className="inline-block h-full">
                          <List
                            listKey={list.key}
                            listTitle={list.title}
                            boardKey={boardKey}
                            cards={listCards}
                            setCards={handleSetCards}
                            handleCreateCard={handleCreateCard}
                            handleEditCard={handleEditCard}
                            handleDeleteCard={handleDeleteCard}
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
