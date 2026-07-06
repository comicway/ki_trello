import { useState, useEffect, useContext } from "react";
import Modal from "../ui/Modal";
import { inputClass, btnPrimary } from "../ui/styles";
import {
  UserAddIcon,
  MailIcon,
  CheckCircleIcon,
  CloseIcon,
  CrownIcon,
} from "../ui/icons";
import { db } from "../../firebase";
import MemberAvatar from "../MemberAvatar";
import { UserContext } from "../../providers/UserProvider";
import { isMemberOwner } from "../../utils/boardRoles";

export default function AddMemberModal({
  visible,
  onClose,
  boardKey,
  ownerIds: ownerIdsProp,
  onMembersUpdated,
  onOwnersUpdated,
}) {
  const currentUser = useContext(UserContext);
  const currentUserUid = currentUser?.uid;
  const ownerIds = ownerIdsProp || [];
  const isCurrentUserOwner = currentUserUid && ownerIds.includes(currentUserUid);

  const [emailInput, setEmailInput] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(null);
  const [roleLoadingUid, setRoleLoadingUid] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (visible && boardKey) {
      db.onceGetMembers(boardKey).then(setMembers).catch(console.error);
    }
  }, [visible, boardKey]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleAdd = async () => {
    if (!isCurrentUserOwner) {
      setError("Solo un owner puede agregar miembros.");
      return;
    }

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

  const handleRemove = async (memberEmail) => {
    setRemovingEmail(memberEmail);
    setError("");
    setSuccess("");

    try {
      await db.doRemoveMember(boardKey, memberEmail);
      const updated = await db.onceGetMembers(boardKey);
      setMembers(updated);
      onMembersUpdated?.(updated);
      setSuccess("Miembro removido con éxito.");
    } catch (err) {
      setError(err.message || "Error al remover miembro.");
      console.error(err);
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleToggleOwner = async (member) => {
    if (!member.uid) {
      setError("Este miembro aún no ha iniciado sesión.");
      return;
    }

    setRoleLoadingUid(member.uid);
    setError("");
    setSuccess("");

    try {
      const isOwner = isMemberOwner(member, ownerIds);
      const result = isOwner
        ? await db.doDemoteOwner(boardKey, member.uid)
        : await db.doPromoteToOwner(boardKey, member.uid);

      onOwnersUpdated?.(result.ownerIds);
      setSuccess(
        isOwner
          ? `${member.displayName || member.email} ya no es Owner.`
          : `${member.displayName || member.email} ahora es Owner.`
      );
    } catch (err) {
      setError(err.message || "Error al cambiar rol.");
      console.error(err);
    } finally {
      setRoleLoadingUid(null);
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
      open={visible}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <UserAddIcon className="h-5 w-5" />
          <span className="font-semibold">Agregar miembro al board</span>
        </div>
      }
    >
      <div className="space-y-5">
        {isCurrentUserOwner ? (
          <>
            <div>
              <label className="block text-light-gray text-sm mb-2">
                <MailIcon className="inline h-4 w-4 mr-1" />
                Correo electrónico (separa múltiples con coma o Enter)
              </label>
              <textarea
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                onKeyDown={handleKeyDown}
                placeholder="ejemplo@correo.com, otro@correo.com"
                rows={3}
                className={`${inputClass} resize-none`}
              />
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
              {success && (
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3" /> {success}
                </p>
              )}
            </div>

            <button type="button" disabled={loading} onClick={handleAdd} className={`${btnPrimary} w-full h-9`}>
              <UserAddIcon className="h-4 w-4" />
              {loading ? "Agregando…" : "Agregar"}
            </button>
          </>
        ) : (
          <>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            {success && (
              <p className="text-green-400 text-xs flex items-center gap-1">
                <CheckCircleIcon className="h-3 w-3" /> {success}
              </p>
            )}
            <p className="text-light-gray text-sm">Solo los owners pueden agregar miembros.</p>
          </>
        )}

        {members.length > 0 && (
          <div>
            <p className="text-light-gray text-sm font-semibold mb-3">
              Miembros del board ({members.length})
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {members.map((member, i) => {
                const memberIsOwner = isMemberOwner(member, ownerIds);
                return (
                  <div
                    key={member.email || i}
                    className="flex items-center gap-3 bg-ki-black border border-border-ki rounded px-3 py-2"
                  >
                    <MemberAvatar member={member} size={32} borderClass="border-ki-black" />
                    <div className="min-w-0 flex-1">
                      <p className="text-pearl-white text-sm font-medium truncate">
                        {member.displayName || member.email}
                      </p>
                      <p className="text-light-gray text-xs truncate">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {memberIsOwner && (
                        <span className="px-2 py-0.5 rounded bg-ki-purple border border-ki-purple text-pearl-white text-xs">
                          Owner
                        </span>
                      )}
                      {isCurrentUserOwner && member.uid && (
                        <button
                          type="button"
                          title={memberIsOwner ? "Quitar rol Owner" : "Asignar rol Owner"}
                          disabled={roleLoadingUid === member.uid}
                          onClick={() => handleToggleOwner(member)}
                          className={`flex-shrink-0 px-2 h-7 rounded border text-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40 ${
                            memberIsOwner
                              ? "border-ki-orange text-ki-orange hover:bg-ki-orange/10"
                              : "border-border-ki text-light-gray hover:text-ki-orange hover:border-ki-orange bg-transparent"
                          }`}
                        >
                          <CrownIcon className="h-3 w-3" />
                          {memberIsOwner ? "Quitar" : "Owner"}
                        </button>
                      )}
                      {isCurrentUserOwner && !memberIsOwner && (
                        <button
                          type="button"
                          title="Remover miembro"
                          disabled={removingEmail === member.email}
                          onClick={() => handleRemove(member.email)}
                          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border border-border-ki text-light-gray hover:text-alert-danger hover:border-alert-danger bg-transparent cursor-pointer transition-colors disabled:opacity-40"
                        >
                          <CloseIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
