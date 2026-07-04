import { useState, useEffect } from "react";
import { Modal, Input, Button, Tag, Avatar } from "antd";
import {
  UserAddOutlined,
  UserOutlined,
  MailOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { db } from "../../firebase";

export default function AddMemberModal({ visible, onClose, boardKey, onMembersUpdated }) {
  const [emailInput, setEmailInput] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (visible && boardKey) {
      db.onceGetMembers(boardKey).then(setMembers).catch(console.error);
    }
  }, [visible, boardKey]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleAdd = async () => {
    const emails = emailInput
      .split(/[,\n;]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const invalid = emails.filter((e) => !isValidEmail(e));
    if (invalid.length > 0) {
      setError(`Correo(s) inválido(s): ${invalid.join(", ")}`);
      return;
    }
    if (emails.length === 0) {
      setError("Ingresa al menos un correo.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      for (const email of emails) {
        await db.doAddMember(boardKey, email);
      }
      const updated = await db.onceGetMembers(boardKey);
      setMembers(updated);
      onMembersUpdated?.(updated);
      setEmailInput("");
      setSuccess(`${emails.length > 1 ? emails.length + " miembros agregados" : "Miembro agregado"} con éxito.`);
    } catch (err) {
      setError("Error al agregar miembro. Intenta de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2 text-pearl-white">
          <UserAddOutlined />
          <span className="font-semibold">Agregar miembro al board</span>
        </div>
      }
      className="dark-modal"
    >
      <div className="space-y-5">
        {/* Input de correos */}
        <div>
          <label className="block text-light-gray text-sm mb-2">
            <MailOutlined className="mr-1" />
            Correo electrónico (separa múltiples con coma o Enter)
          </label>
          <Input.TextArea
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setError("");
              setSuccess("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="ejemplo@correo.com, otro@correo.com"
            rows={3}
            className="bg-ki-black text-pearl-white border-border-ki rounded resize-none"
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          {success && (
            <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
              <CheckCircleOutlined /> {success}
            </p>
          )}
        </div>

        <Button
          type="primary"
          loading={loading}
          onClick={handleAdd}
          icon={<UserAddOutlined />}
          className="w-full bg-ki-purple border-ki-purple hover:bg-ki-pastel text-pearl-white font-medium h-9"
        >
          Agregar
        </Button>

        {/* Lista de miembros actuales */}
        {members.length > 0 && (
          <div>
            <p className="text-light-gray text-sm font-semibold mb-3">
              Miembros del board ({members.length})
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {members.map((member, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-ki-black border border-border-ki rounded px-3 py-2"
                >
                  <Avatar
                    src={member.photoURL}
                    icon={!member.photoURL && <UserOutlined />}
                    size={32}
                    className="bg-ki-purple flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-pearl-white text-sm font-medium truncate">
                      {member.displayName || member.email}
                    </p>
                    <p className="text-light-gray text-xs truncate">{member.email}</p>
                  </div>
                  {i === 0 && (
                    <Tag className="bg-ki-purple border-ki-purple text-pearl-white text-xs flex-shrink-0">
                      Owner
                    </Tag>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
