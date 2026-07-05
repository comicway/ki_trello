import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { firebase } from "../../firebase";
import Link from "next/link";
import { Button } from "antd";
import CreateBoardModal from "../../components/CreateBoardModal";
import CreateBoardTarea from "../../components/CreateBoardTarea";
import HomeDashboard from "../../components/HomeDashboard";
import Loader from "../../components/Loader";

function Boards() {
  const [modalOpen, setModalOpen] = useState(false);
  const [boards, setBoards] = useState([]);
  const [myPendingTareas, setMyPendingTareas] = useState([]);
  const [membersWithPendingCounts, setMembersWithPendingCounts] = useState([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebase.auth.onAuthStateChanged(async (user) => {
      if (!user?.uid || !user?.email) {
        setBoards([]);
        setMyPendingTareas([]);
        setMembersWithPendingCounts([]);
        setCurrentUserEmail("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setCurrentUserEmail(user.email);

      try {
        await db.doClaimMembership(user).catch((err) => {
          console.error("Error en claimMembership:", err);
        });

        const result = await db.onceGetBoards(user.uid, user.email);
        setBoards(result);

        const dashboard = await db.onceGetHomeDashboard(result, user.email);
        setMyPendingTareas(dashboard.myPendingTareas);
        setMembersWithPendingCounts(dashboard.membersWithPendingCounts);
      } catch (err) {
        console.error("Error cargando boards:", err);
        setBoards([]);
        setMyPendingTareas([]);
        setMembersWithPendingCounts([]);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCreateBoard = (board) => {
    db.doCreateBoard(board).then((response) => {
      const updatedBoards = [...boards, response];
      setBoards(updatedBoards);
      setModalOpen(false);
      db.onceGetHomeDashboard(updatedBoards, currentUserEmail).then((dashboard) => {
        setMyPendingTareas(dashboard.myPendingTareas);
        setMembersWithPendingCounts(dashboard.membersWithPendingCounts);
      });
    });
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="h-full overflow-auto">
          <div className="flex flex-col items-center justify-center relative py-6 px-4 max-w-5xl md:grid md:grid-cols-1 lg:grid-cols-3 md:gap-3 md:w-auto md:max-w-4xl md:mx-auto">
            {boards.map((board) => (
              <div key={board.key}>
                <Link href={`/b/${board.key}`} className="w-full mb-6 md:m-0 block">
                  <Button className="h-[120px] w-full md:h-[188px] md:w-[280px] px-4 py-3 !bg-[#303234] rounded-md text-base text-pearl-white font-medium overflow-hidden whitespace-normal border border-border-ki hover:!bg-ki-black hover:text-ki-orange transition-colors">
                    <span className="block break-words hyphens-auto text-pearl-white">{board.title}</span>
                  </Button>
                </Link>
              </div>
            ))}
            <div className="w-full md:w-[280px] md:h-[188px]">
              <CreateBoardTarea onClick={() => setModalOpen(true)} />
            </div>
          </div>

          <HomeDashboard
            myPendingTareas={myPendingTareas}
            membersWithPendingCounts={membersWithPendingCounts}
            currentUserEmail={currentUserEmail}
          />

          <CreateBoardModal
            onCreateBoard={handleCreateBoard}
            onCloseModal={() => setModalOpen(false)}
            visible={modalOpen}
          />
        </div>
      )}
    </>
  );
}

export default Boards;
