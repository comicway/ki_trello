import { useState, useEffect } from "react";
import { Modal, Input, Button } from "antd";
import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

const CONFIRM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateConfirmCode = () =>
  Array.from({ length: 6 }, () =>
    CONFIRM_CHARS[Math.floor(Math.random() * CONFIRM_CHARS.length)]
  ).join("");

export default function DeleteBoardModal({
  visible,
  onClose,
  boardTitle,
  onConfirm,
}) {
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
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2 text-pearl-white">
          <ExclamationCircleOutlined className="text-alert-danger" />
          <span className="font-semibold">Eliminar board</span>
        </div>
      }
      className="dark-modal"
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

        <Input
          value={userInput}
          onChange={(e) => {
            setUserInput(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="Pega el código aquí"
          className="bg-ki-black text-pearl-white border-border-ki font-mono tracking-wider uppercase"
          autoComplete="off"
        />

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <Button
            onClick={onClose}
            disabled={loading}
            className="bg-transparent border-border-ki text-light-gray hover:text-pearl-white hover:border-ki-orange"
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            danger
            loading={loading}
            disabled={!isMatch}
            onClick={handleConfirm}
            icon={<DeleteOutlined />}
            className="font-medium"
          >
            Eliminar board
          </Button>
        </div>
      </div>
    </Modal>
  );
}
