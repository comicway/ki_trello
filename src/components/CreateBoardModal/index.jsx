import { useState } from "react";
import Modal from "../ui/Modal";
import { inputClass, btnPrimary } from "../ui/styles";

export default function CreateBoardModal(props) {
  const [boardTitle, setBoardTitle] = useState("");
  const { onCloseModal, onCreateBoard, visible } = props;

  const handleCreateBoard = (event) => {
    event.preventDefault();
    if (boardTitle !== "") {
      onCreateBoard({ title: boardTitle });
      setBoardTitle("");
    }
  };

  return (
    <Modal open={visible} onClose={onCloseModal} title={<span className="font-semibold text-lg">Create board</span>} width="320px">
      <form onSubmit={handleCreateBoard} className="space-y-4">
        <input
          className={inputClass}
          placeholder="Add board title"
          onChange={(e) => setBoardTitle(e.target.value)}
          value={boardTitle}
          autoFocus
        />
        <button type="submit" disabled={boardTitle === ""} className={btnPrimary}>
          Create
        </button>
      </form>
    </Modal>
  );
}
