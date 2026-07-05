import { useState, useEffect, useContext } from "react";
import moment from "moment";
import Drawer from "../ui/Drawer";
import Subtarea from "../Subtarea";
import Comments from "../Comments";
import LinkPreviewList from "../LinkPreviewList";
import DoneToggle from "../DoneToggle";
import DoneFooter from "../DoneFooter";
import ReadyForSalesforceSwitch from "../ReadyForSalesforceSwitch";
import MarkdownContent from "../MarkdownContent";
import useResizableDrawer from "../../hooks/useResizableDrawer";
import { UserContext } from "../../providers/UserProvider";
import { buildDoneUpdate, isFinalizadoList } from "../../utils/completion";
import { inputClass, selectClass } from "../ui/styles";
import {
  AlignLeftIcon,
  CalendarIcon,
  SwapIcon,
  LinkIcon,
  CloseIcon,
  UserIcon,
  PlusIcon,
  ListIcon,
} from "../ui/icons";

export default function TareaModal(props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [assigneeEmail, setAssigneeEmail] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [done, setDone] = useState(false);
  const [doneAt, setDoneAt] = useState(null);
  const [doneBy, setDoneBy] = useState(null);
  const [readyForSalesforce, setReadyForSalesforce] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drawerWidth, handleResizeMouseDown] = useResizableDrawer(520);
  const currentUser = useContext(UserContext);

  const {
    visible,
    tareaTitle,
    handleHideModal,
    tareaDescription,
    tareaDueDate,
    tareaAssigneeEmail,
    tareaSubtasks,
    tareaDone,
    tareaDoneAt,
    tareaDoneBy,
    tareaReadyForSalesforce,
    handleEditTarea,
    tareaKey,
    listKey,
    boardKey,
    lists,
    members,
    handleMoveTareaManual,
  } = props;

  useEffect(() => {
    setTitle(tareaTitle);
    setDescription(tareaDescription);
    setDueDate(tareaDueDate ? moment(tareaDueDate) : null);
    setAssigneeEmail(tareaAssigneeEmail || null);
    setSubtasks(tareaSubtasks || []);
    setDone(!!tareaDone);
    setDoneAt(tareaDoneAt || null);
    setDoneBy(tareaDoneBy || null);
    setReadyForSalesforce(!!tareaReadyForSalesforce);
  }, [tareaTitle, tareaDescription, tareaDueDate, tareaAssigneeEmail, tareaSubtasks, tareaDone, tareaDoneAt, tareaDoneBy, tareaReadyForSalesforce]);

  const handleSave = (updates) => {
    let newDoneAt = updates.doneAt !== undefined ? updates.doneAt : doneAt;
    let newDoneBy = updates.doneBy !== undefined ? updates.doneBy : doneBy;
    let newDone = updates.done !== undefined ? updates.done : done;

    if (updates.done === true && !doneAt) {
      const meta = buildDoneUpdate(true, currentUser, { doneAt, doneBy });
      newDoneAt = meta.doneAt;
      newDoneBy = meta.doneBy;
      setDoneAt(newDoneAt);
      setDoneBy(newDoneBy);
    }
    if (updates.done === false) {
      newDoneAt = null;
      newDoneBy = null;
      setDoneAt(null);
      setDoneBy(null);
    }

    const updatedTarea = {
      title: updates.title !== undefined ? updates.title : title,
      description: updates.description !== undefined ? updates.description : description || "",
      dueDate: updates.dueDate !== undefined ? updates.dueDate : dueDate ? dueDate.toISOString() : null,
      assigneeEmail: updates.assigneeEmail !== undefined ? updates.assigneeEmail : assigneeEmail,
      subtasks: updates.subtasks !== undefined ? updates.subtasks : subtasks,
      done: newDone,
      doneAt: newDoneAt,
      doneBy: newDoneBy,
      readyForSalesforce:
        updates.readyForSalesforce !== undefined ? updates.readyForSalesforce : readyForSalesforce,
      lastEditedBy: currentUser?.displayName || currentUser?.email || null,
      lastEditedByEmail: currentUser?.email || null,
    };
    return handleEditTarea({ listKey, tareaKey, tarea: updatedTarea });
  };

  const handleSubtaskUpdate = (subtaskId, updates) => {
    const updated = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, ...updates } : s
    );
    setSubtasks(updated);
    handleSave({ subtasks: updated });
  };

  const handleSubtaskDelete = (subtaskId) => {
    const updated = subtasks.filter((s) => s.id !== subtaskId);
    setSubtasks(updated);
    handleSave({ subtasks: updated });
  };

  const handleAddSubtask = () => {
    const newSubtask = {
      id: `${Date.now()}`,
      title: "",
      description: "",
      dueDate: null,
      assigneeEmail: null,
      readyForSalesforce: false,
    };
    const updated = [...subtasks, newSubtask];
    setSubtasks(updated);
    handleSave({ subtasks: updated });
  };

  const handleAssigneeChange = (email) => {
    setAssigneeEmail(email || null);
    handleSave({ assigneeEmail: email || null });
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (title !== tareaTitle) handleSave({ title });
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") handleTitleBlur();
    if (e.key === "Escape") {
      setTitle(tareaTitle);
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

  useEffect(() => {
    if (!visible || doneAt || !isFinalizadoList(lists, listKey)) return;
    const meta = buildDoneUpdate(true, currentUser, { doneAt, doneBy });
    setDone(true);
    setDoneAt(meta.doneAt);
    setDoneBy(meta.doneBy);
    handleEditTarea({ listKey, tareaKey, tarea: meta });
  }, [visible, listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (newListKey) => {
    if (newListKey === listKey) return;
    if (isFinalizadoList(lists, newListKey)) {
      const meta = buildDoneUpdate(true, currentUser, { doneAt, doneBy });
      handleEditTarea({ listKey, tareaKey, tarea: meta });
    }
    handleMoveTareaManual(tareaKey, listKey, newListKey);
    handleHideModal();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?tarea=${tareaKey}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    setEditingTitle(false);
    setEditingDescription(false);
    handleHideModal();
  };

  const dateInputValue = dueDate ? moment(dueDate).format("YYYY-MM-DD") : "";

  return (
    <Drawer open={visible} onClose={handleClose} width={drawerWidth}>
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10"
        title="Arrastrar para redimensionar"
      />

      <div className="flex items-center gap-2 text-pearl-white mb-8">
        <DoneToggle
          done={done}
          onClick={() => {
            const next = !done;
            setDone(next);
            handleSave({ done: next });
          }}
        />
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
              {title}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          title={copied ? "¡Enlace copiado!" : "Copiar enlace"}
          className="flex-shrink-0 p-1.5 rounded text-light-gray hover:text-pearl-white hover:bg-ki-black transition-colors border-none bg-transparent cursor-pointer"
        >
          <LinkIcon className={copied ? "text-green-400" : "h-4 w-4"} />
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

      <div className="flex flex-row gap-2 mb-6">
        {members && members.length > 0 && (
          <div className="flex-1 min-w-0">
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

        <div className="flex-1 min-w-0">
          <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
            <SwapIcon className="h-4 w-4" />
            <span>Estado</span>
          </h4>
          <select value={listKey} onChange={(e) => handleStatusChange(e.target.value)} className={selectClass}>
            {lists?.map((list) => (
              <option key={list.key} value={list.key}>
                {list.title}
              </option>
            ))}
          </select>
        </div>
      </div>

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
        <div>
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
                    setDescription(tareaDescription);
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
              {tareaDescription ? (
                <MarkdownContent>{tareaDescription}</MarkdownContent>
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
      </div>

      <div className="mt-8">
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <ListIcon className="h-4 w-4" />
          <span>Subtareas</span>
        </h4>

        {subtasks.map((subtask) => (
          <Subtarea
            key={subtask.id}
            subtask={subtask}
            members={members}
            onUpdate={handleSubtaskUpdate}
            onDelete={handleSubtaskDelete}
            boardKey={boardKey}
            listKey={listKey}
            tareaKey={tareaKey}
          />
        ))}

        <button
          type="button"
          onClick={handleAddSubtask}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-md bg-ki-black border border-border-ki border-dashed text-light-gray hover:text-pearl-white hover:border-ki-purple transition-colors cursor-pointer"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Agregar subtarea</span>
        </button>
      </div>

      <Comments boardKey={boardKey} listKey={listKey} tareaKey={tareaKey} members={members} />

      <ReadyForSalesforceSwitch
        value={readyForSalesforce}
        onChange={(next) => {
          setReadyForSalesforce(next);
          handleSave({ readyForSalesforce: next });
        }}
      />

      <DoneFooter doneBy={doneBy} doneAt={doneAt} />
    </Drawer>
  );
}
