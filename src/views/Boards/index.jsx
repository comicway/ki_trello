import { useState, useEffect } from "react";
import { mergeDataWithKey } from "../../utils";
import { db } from "../../firebase";
import { Link } from "react-router-dom";
import { Button } from "antd";
import CreateBoardModal from "../../components/CreateBoardModal";
import CreateBoardCard from "../../components/CreateBoardCard";
import Loader from "../../components/Loader";


function Boards(props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get boards
  useEffect(() => {
    setLoading(true);
    db.onceGetBoards()
      .then((snapshot) => {
        if (!snapshot.val()) {
          setLoading(false);
          return;
        }
        setBoards(mergeDataWithKey(snapshot.val()));
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
      });
  }, []);

  const handleCreateBoard = (board) => {
    db.doCreateBoard(board).then((response) => {
      console.log(response);
      const updatedBoards = [...boards];
      updatedBoards.push(response);
      setBoards(updatedBoards);
      setModalOpen(false);
    });
  };

  const handleModalOpen = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="h-full">
          <div className="flex flex-col items-center justify-center relative py-6 px-4 md:grid md:grid-cols-1 lg:grid-cols-3 md:gap-3 md:w-auto md:max-w-4xl md:mx-auto">
            {boards.map((board, index) => {
              return (
                <div key={index}>
                  <Link
                    index={index}
                    to={{
                      pathname: `b/${board.key}`,
                      state: { boardKey: board.key },
                    }}
                    className="w-full mb-6 md:m-0 block"
                  >
                    <Button className="h-[120px] w-full md:h-[188px] md:w-[280px] px-4 py-3 bg-dark-blue rounded-md text-base text-pearl-white font-medium overflow-hidden whitespace-normal border border-border-ki hover:bg-ki-black hover:text-ki-orange transition-colors">
                      <span className="block break-words hyphens-auto">{board.title}</span>
                    </Button>
                  </Link>
                </div>
              );
            })}
            <div className="w-full md:w-[280px] md:h-[188px]">
              <CreateBoardCard onClick={() => handleModalOpen()} />
            </div>
          </div>

          <CreateBoardModal
            onCreateBoard={handleCreateBoard}
            onCloseModal={handleModalClose}
            visible={modalOpen}
          />
        </div>
      )}
    </>
  );
}

export default Boards;
