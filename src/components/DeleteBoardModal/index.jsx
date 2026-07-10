import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { inputClass, btnGhost, btnDanger } from "../ui/styles";
import { AlertIcon, DeleteIcon } from "../ui/icons";

const CONFIRM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateConfirmCode = () =>
  Array.from({ length: 6 }, () =>
    CONFIRM_CHARS[Math.floor(Math.random() * CONFIRM_CHARS.length)]
  ).join("");

export default function DeleteBoardModal({ visible, onClose, boardTitle, onConfirm }) {
  const [confirmCode, setConfirmCode] = useState("");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setConfirmCode(generateConfirmCode());
      setUserInput("");
      setError("");
      setLoading(false);
    }
  }, [visible]);

  const isMatch = userInput === confirmCode;

  const handleConfirm = async () => {
    if (!isMatch) return;
    setLoading(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message || "Error al eliminar el board.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <AlertIcon className="h-5 w-5 text-alert-danger" />
          <span className="font-semibold">Eliminar board</span>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-light-gray text-sm">
          Esta acción es permanente. Se eliminarán todas las listas y tareas de{" "}
          <span className="text-pearl-white font-medium">{boardTitle || "este board"}</span>.
        </p>

        <div className="bg-ki-black border border-border-ki rounded px-3 py-2">
          <p className="text-light-gray text-xs mb-1">Escribe este código para confirmar:</p>
          <p className="text-pearl-white font-mono text-lg tracking-widest select-all">{confirmCode}</p>
        </div>

        <input
          value={userInput}
          onChange={(e) => {
            setUserInput(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="Pega el código aquí"
          className={`${inputClass} font-mono tracking-wider uppercase`}
          autoComplete="off"
        />

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} disabled={loading} className={btnGhost}>
            Cancelar
          </button>
          <button type="button" disabled={!isMatch || loading} onClick={handleConfirm} className={btnDanger}>
            <DeleteIcon className="h-4 w-4" />
            {loading ? "Eliminando…" : "Eliminar board"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
