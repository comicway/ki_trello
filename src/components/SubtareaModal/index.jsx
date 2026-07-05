import { useState, useEffect, useContext } from "react";
import { Drawer, Input, DatePicker, Select, Avatar } from "antd";
import {
  AlignLeftOutlined,
  CalendarOutlined,
  CloseOutlined,
  DeleteOutlined,
  UserOutlined,
} from "@ant-design/icons";
import moment from "moment";
import dayjs from "dayjs";
import { panelDayjs, toDayjs } from "../../utils/datePicker";
import Comments from "../Comments";
import LinkPreviewList from "../LinkPreviewList";
import DoneToggle from "../DoneToggle";
import DoneFooter from "../DoneFooter";
import ReadyForSalesforceSwitch from "../ReadyForSalesforceSwitch";
import MarkdownContent from "../MarkdownContent";
import { buildDoneUpdate } from "../../utils/completion";
import useResizableDrawer from "../../hooks/useResizableDrawer";
import { UserContext } from "../../providers/UserProvider";

const { Option } = Select;

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
  const [pickerValue, setPickerValue] = useState(() => dayjs());
  const [drawerWidth, handleResizeMouseDown] = useResizableDrawer(520);
  const currentUser = useContext(UserContext);

  useEffect(() => {
    if (!subtask) return;
    setTitle(subtask.title || "");
    setDescription(subtask.description || "");
    setDueDate(subtask.dueDate ? moment(subtask.dueDate) : null);
    setAssigneeEmail(subtask.assigneeEmail || null);
    setPickerValue(panelDayjs(subtask.dueDate));
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

  const handleDateChange = (date) => {
    const next = date ? moment(date.toDate()) : null;
    setDueDate(next);
    setPickerValue(panelDayjs(date));
    handleSave({ dueDate: date ? date.toISOString() : null });
  };

  const handleAssigneeChange = (email) => {
    setAssigneeEmail(email || null);
    handleSave({ assigneeEmail: email || null });
  };

  const customFormat = (value) => {
    if (!value) return "";
    if (dayjs().isSame(value, "day")) return "hoy";
    return value.format("DD MMM");
  };

  const handleClose = () => {
    setEditingTitle(false);
    setEditingDescription(false);
    onClose();
  };

  return (
    <Drawer
      placement="right"
      width={drawerWidth}
      closable={false}
      onClose={handleClose}
      open={visible}
      styles={{
        content: { backgroundColor: "#1d2125", color: "#b6c2cf" },
        body: { padding: "24px" },
      }}
      zIndex={1001}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 6,
          cursor: "ew-resize", zIndex: 10, background: "transparent",
        }}
        title="Arrastrar para redimensionar"
      />
      <div className="flex items-center gap-2 text-pearl-white mb-8">
        <DoneToggle
          done={!!subtask.done}
          onClick={() => handleSave({ done: !subtask.done })}
        />
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
              {title || "Sin título"}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          title="Eliminar subtarea"
          className="flex-shrink-0 p-1.5 rounded text-light-gray hover:text-alert-danger hover:bg-ki-black transition-colors border-none bg-transparent cursor-pointer"
        >
          <DeleteOutlined />
        </button>
        <button
          onClick={handleClose}
          title="Cerrar panel"
          className="flex-shrink-0 p-1.5 rounded text-light-gray hover:text-pearl-white hover:bg-ki-black transition-colors border-none bg-transparent cursor-pointer"
        >
          <CloseOutlined />
        </button>
      </div>

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
            styles={{ popup: { backgroundColor: "#22272b" } }}
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

      <div className="mb-8">
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <CalendarOutlined />
          <span>Fecha de entrega</span>
        </h4>
        <DatePicker
          value={toDayjs(dueDate)}
          defaultPickerValue={panelDayjs(dueDate)}
          pickerValue={pickerValue}
          onPickerValueChange={setPickerValue}
          onOpenChange={(open) => {
            if (open) setPickerValue(panelDayjs(dueDate));
          }}
          onChange={handleDateChange}
          format={customFormat}
          placeholder="Sin fecha de entrega"
          allowClear
          className="w-full bg-ki-black text-pearl-white border-border-ki hover:border-ki-purple focus:border-ki-purple transition-colors h-10 px-3 cursor-pointer"
          classNames={{ popup: { root: "dark-datepicker" } }}
        />
      </div>

      <div>
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <AlignLeftOutlined />
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

      {/* Comentarios */}
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

      {/* Done footer */}
      <DoneFooter
        doneBy={subtask.doneBy}
        doneAt={subtask.doneAt}
        label="Subtarea Finalizada"
      />
    </Drawer>
  );
}
