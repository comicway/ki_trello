import { useState, useEffect, useContext } from "react";
import moment from "moment";
import Drawer from "../ui/Drawer";
import Comments from "../Comments";
import LinkPreviewList from "../LinkPreviewList";
import DoneToggle from "../DoneToggle";
import DoneFooter from "../DoneFooter";
import ReadyForSalesforceSwitch from "../ReadyForSalesforceSwitch";
import MarkdownContent from "../MarkdownContent";
import useResizableDrawer from "../../hooks/useResizableDrawer";
import { UserContext } from "../../providers/UserProvider";
import { buildDoneUpdate } from "../../utils/completion";
import { inputClass, selectClass } from "../ui/styles";
import {
  AlignLeftIcon,
  CalendarIcon,
  CloseIcon,
  DeleteIcon,
  UserIcon,
} from "../ui/icons";

export default function SubtareaModal({
  visible,
  subtask,
  members,
  onClose,
  onUpdate,
  onDelete,
  boardKey,
  listKey,
  tareaKey,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [assigneeEmail, setAssigneeEmail] = useState(null);
  const [drawerWidth, handleResizeMouseDown] = useResizableDrawer(520);
  const currentUser = useContext(UserContext);

  useEffect(() => {
    if (!subtask) return;
    setTitle(subtask.title || "");
    setDescription(subtask.description || "");
    setDueDate(subtask.dueDate ? moment(subtask.dueDate) : null);
    setAssigneeEmail(subtask.assigneeEmail || null);
  }, [subtask]);

  if (!subtask) return null;

  const handleSave = (updates) => {
    let doneFields = {};
    if (updates.done !== undefined) {
      doneFields = buildDoneUpdate(updates.done, currentUser, {
        doneAt: subtask.doneAt,
        doneBy: subtask.doneBy,
      });
    }
    onUpdate(subtask.id, {
      title: updates.title !== undefined ? updates.title : title,
      description: updates.description !== undefined ? updates.description : description,
      dueDate: updates.dueDate !== undefined ? updates.dueDate : dueDate ? dueDate.toISOString() : null,
      assigneeEmail: updates.assigneeEmail !== undefined ? updates.assigneeEmail : assigneeEmail,
      ...(updates.readyForSalesforce !== undefined
        ? { readyForSalesforce: updates.readyForSalesforce }
        : {}),
      ...doneFields,
    });
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (title !== subtask.title) handleSave({ title });
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") handleTitleBlur();
    if (e.key === "Escape") {
      setTitle(subtask.title || "");
      setEditingTitle(false);
    }
  };

  const handleDescriptionSave = (e) => {
    e.preventDefault();
    setEditingDescription(false);
    handleSave({ description });
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    const next = val ? moment(val) : null;
    setDueDate(next);
    handleSave({ dueDate: val ? moment(val).toISOString() : null });
  };

  const handleAssigneeChange = (email) => {
    setAssigneeEmail(email || null);
    handleSave({ assigneeEmail: email || null });
  };

  const handleClose = () => {
    setEditingTitle(false);
    setEditingDescription(false);
    onClose();
  };

  const dateInputValue = dueDate ? moment(dueDate).format("YYYY-MM-DD") : "";

  return (
    <Drawer open={visible} onClose={handleClose} width={drawerWidth} zIndex={1001}>
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10"
        title="Arrastrar para redimensionar"
      />

      <div className="flex items-center gap-2 text-pearl-white mb-8">
        <DoneToggle done={!!subtask.done} onClick={() => handleSave({ done: !subtask.done })} />
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className={`${inputClass} border-ki-purple`}
            />
          ) : (
            <span
              className="font-semibold text-xl cursor-text block truncate"
              onClick={() => setEditingTitle(true)}
              title={title}
            >
              {title || "Sin título"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          title="Eliminar subtarea"
          className="flex-shrink-0 p-1.5 rounded text-light-gray hover:text-alert-danger hover:bg-ki-black transition-colors border-none bg-transparent cursor-pointer"
        >
          <DeleteIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleClose}
          title="Cerrar panel"
          className="flex-shrink-0 p-1.5 rounded text-light-gray hover:text-pearl-white hover:bg-ki-black transition-colors border-none bg-transparent cursor-pointer"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {members && members.length > 0 && (
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
            <UserIcon className="h-4 w-4" />
            <span>Responsable</span>
          </h4>
          <select
            value={assigneeEmail || ""}
            onChange={(e) => handleAssigneeChange(e.target.value || null)}
            className={selectClass}
          >
            <option value="">Sin responsable asignado</option>
            {members.map((member, i) => (
              <option key={member.email || i} value={member.email}>
                {member.displayName || member.email}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-8">
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <CalendarIcon className="h-4 w-4" />
          <span>Fecha de entrega</span>
        </h4>
        <input
          type="date"
          value={dateInputValue}
          onChange={handleDateChange}
          className={`${selectClass} [color-scheme:dark]`}
        />
      </div>

      <div>
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <AlignLeftIcon className="h-4 w-4" />
          <span>Descripción</span>
        </h4>
        {editingDescription ? (
          <form onSubmit={handleDescriptionSave}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agrega una descripción más detallada..."
              autoFocus
              className="w-full min-h-[216px] bg-ki-black text-pearl-white border border-border-ki rounded px-3 py-2 text-sm resize-none outline-none hover:border-ki-purple focus:border-ki-purple transition-colors mb-3"
              rows={9}
            />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-1.5 bg-ki-purple border border-border-ki text-pearl-white rounded text-sm font-medium hover:bg-ki-pastel transition-colors cursor-pointer">
                Guardar
              </button>
              <button
                type="button"
                className="px-4 py-1.5 bg-transparent border border-border-ki text-light-gray rounded text-sm font-medium hover:border-alert-danger hover:text-alert-danger transition-colors cursor-pointer"
                onClick={() => {
                  setEditingDescription(false);
                  setDescription(subtask.description || "");
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div
            onClick={() => setEditingDescription(true)}
            className="bg-ki-black border border-border-ki rounded px-4 py-3 text-light-gray cursor-pointer hover:border-ki-purple transition-colors min-h-[216px]"
          >
            {description ? (
              <MarkdownContent>{description}</MarkdownContent>
            ) : (
              <span className="italic text-light-gray text-sm">
                Agrega una descripción más detallada...
              </span>
            )}
          </div>
        )}
        <LinkPreviewList
          text={description}
          onEdit={(url) => {
            const newUrl = window.prompt("Editar URL:", url);
            if (newUrl && newUrl.trim() !== url) {
              const updated = description.replace(url, newUrl.trim());
              setDescription(updated);
              handleSave({ description: updated });
            }
          }}
          onDelete={(url) => {
            const updated = description.replace(url, "").replace(/\s{2,}/g, " ").trim();
            setDescription(updated);
            handleSave({ description: updated });
          }}
        />
      </div>

      <Comments
        boardKey={boardKey}
        listKey={listKey}
        tareaKey={tareaKey}
        subtaskId={subtask.id}
        members={members}
      />

      <ReadyForSalesforceSwitch
        value={!!subtask.readyForSalesforce}
        onChange={(next) => handleSave({ readyForSalesforce: next })}
      />

      <DoneFooter doneBy={subtask.doneBy} doneAt={subtask.doneAt} label="Subtarea Finalizada" />
    </Drawer>
  );
}
