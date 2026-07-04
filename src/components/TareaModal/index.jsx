import { useState, useEffect, useContext } from "react";
import { Drawer, Input, DatePicker, Select, Avatar } from "antd";
import {
  AlignLeftOutlined,
  CalendarOutlined,
  SwapOutlined,
  LinkOutlined,
  CloseOutlined,
  UserOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import moment from "moment";
import Subtarea from "../Subtarea";
import Comments from "../Comments";
import LinkPreviewList from "../LinkPreviewList";
import DoneToggle from "../DoneToggle";
import DoneFooter from "../DoneFooter";
import MarkdownContent from "../MarkdownContent";
import useResizableDrawer from "../../hooks/useResizableDrawer";
import { UserContext } from "../../providers/UserProvider";
import { buildDoneUpdate, isFinalizadoList } from "../../utils/completion";

const { Option } = Select;

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
  }, [tareaTitle, tareaDescription, tareaDueDate, tareaAssigneeEmail, tareaSubtasks, tareaDone, tareaDoneAt, tareaDoneBy]);

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
    if (title !== tareaTitle) {
      handleSave({ title });
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    }
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

  const handleDateChange = (date) => {
    setDueDate(date);
    handleSave({ dueDate: date ? date.toISOString() : null });
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

  const customFormat = (value) => {
    if (moment().isSame(value, "day")) return "Hoy";
    return value.format("DD MMM YYYY");
  };

  const handleClose = () => {
    setEditingTitle(false);
    setEditingDescription(false);
    handleHideModal();
  };

  return (
    <Drawer
      placement="right"
      width={drawerWidth}
      closable={false}
      onClose={handleClose}
      visible={visible}
      drawerStyle={{ backgroundColor: "#1d2125", color: "#b6c2cf" }}
      bodyStyle={{ padding: "24px" }}
    >
      {/* Resize handle on the left edge */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 6,
          cursor: "ew-resize", zIndex: 10,
          background: "transparent",
        }}
        title="Arrastrar para redimensionar"
      />
      {/* Header: Title + icons */}
      <div className="flex items-center gap-2 text-pearl-white mb-8">
        <DoneToggle
          done={done}
          onClick={() => {
            const next = !done;
            setDone(next);
            handleSave({ done: next });
          }}
        />

        {/* Inline-editable title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="bg-ki-black text-pearl-white border-ki-purple"
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

        {/* Copy link icon */}
        <button
          onClick={handleCopyLink}
          title={copied ? "¡Enlace copiado!" : "Copiar enlace"}
          className="flex-shrink-0 p-1.5 rounded text-light-gray hover:text-pearl-white hover:bg-ki-black transition-colors border-none bg-transparent cursor-pointer"
        >
          <LinkOutlined className={copied ? "text-green-400" : ""} />
        </button>

        {/* Close icon */}
        <button
          onClick={handleClose}
          title="Cerrar panel"
          className="flex-shrink-0 p-1.5 rounded text-light-gray hover:text-pearl-white hover:bg-ki-black transition-colors border-none bg-transparent cursor-pointer"
        >
          <CloseOutlined />
        </button>
      </div>

      {/* Responsable */}
      {members && members.length > 0 && (
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
            <UserOutlined />
            <span>Responsable</span>
          </h4>
          <Select
            value={assigneeEmail}
            onChange={handleAssigneeChange}
            placeholder="Sin responsable asignado"
            allowClear
            className="w-full"
            dropdownStyle={{ backgroundColor: "#22272b" }}
          >
            {members.map((member, i) => (
              <Option key={i} value={member.email}>
                <div className="flex items-center gap-2">
                  <Avatar
                    src={member.photoURL}
                    icon={!member.photoURL && <UserOutlined />}
                    size={20}
                    className="bg-ki-purple flex-shrink-0"
                  />
                  <span>{member.displayName || member.email}</span>
                </div>
              </Option>
            ))}
          </Select>
        </div>
      )}

      {/* Status selector */}
      <div className="mb-6">
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <SwapOutlined />
          <span>Estado</span>
        </h4>
        <Select
          value={listKey}
          onChange={handleStatusChange}
          className="w-full"
          dropdownStyle={{ backgroundColor: "#22272b" }}
          dropdownClassName="dark-select-dropdown"
        >
          {lists &&
            lists.map((list) => (
              <Option key={list.key} value={list.key}>
                {list.title}
              </Option>
            ))}
        </Select>
      </div>

      {/* Due Date */}
      <div className="mb-8">
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <CalendarOutlined />
          <span>Fecha de entrega</span>
        </h4>
        <DatePicker
          value={dueDate}
          onChange={handleDateChange}
          format={customFormat}
          placeholder="Sin fecha de entrega"
          allowClear
          className="w-full bg-ki-black text-pearl-white border-border-ki hover:border-ki-purple focus:border-ki-purple transition-colors h-10 px-3 cursor-pointer"
          dropdownClassName="dark-datepicker"
        />
      </div>

      {/* Description */}
      <div>
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <AlignLeftOutlined />
          <span>Descripción</span>
        </h4>
        <div>
          {editingDescription ? (
            <form onSubmit={handleDescriptionSave}>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                ref={(el) => {
                  if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
                }}
                placeholder="Agrega una descripción más detallada..."
                autoFocus
                className="w-full bg-ki-black text-pearl-white border border-border-ki rounded px-3 py-2 text-sm resize-none outline-none hover:border-ki-purple focus:border-ki-purple transition-colors mb-3 overflow-hidden"
                rows={1}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-ki-purple border border-border-ki text-pearl-white rounded text-sm font-medium hover:bg-ki-pastel transition-colors"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-transparent border border-border-ki text-light-gray rounded text-sm font-medium hover:border-alert-danger hover:text-alert-danger transition-colors"
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
              className="bg-ki-black border border-border-ki rounded px-4 py-3 text-light-gray cursor-pointer hover:border-ki-purple transition-colors min-h-[60px]"
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

      {/* Subtareas */}
      <div className="mt-8">
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <UnorderedListOutlined />
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
          <PlusOutlined />
          <span>Agregar subtarea</span>
        </button>
      </div>

      {/* Comentarios */}
      <Comments
        boardKey={boardKey}
        listKey={listKey}
        tareaKey={tareaKey}
        members={members}
      />

      {/* Done footer */}
      <DoneFooter doneBy={doneBy} doneAt={doneAt} />
    </Drawer>
  );
}
