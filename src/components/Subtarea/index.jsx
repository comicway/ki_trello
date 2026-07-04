import { useState, useContext } from "react";
import { DatePicker, Dropdown, Menu, Avatar } from "antd";
import { CalendarOutlined, UserOutlined } from "@ant-design/icons";
import moment from "moment";
import SubtareaModal from "../SubtareaModal";
import DoneToggle from "../DoneToggle";
import { UserContext } from "../../providers/UserProvider";
import { buildDoneUpdate } from "../../utils/completion";

const dateLabel = (date) => {
  if (!date) return null;
  if (moment().isSame(date, "day")) return "hoy";
  return date.format("DD MMM");
};

export default function Subtarea({ subtask, members, onUpdate, onDelete, boardKey, listKey, tareaKey }) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const currentUser = useContext(UserContext);

  const dueDate = subtask.dueDate ? moment(subtask.dueDate) : null;
  const assignee = members?.find((m) => m.email === subtask.assigneeEmail);
  const dateText = dateLabel(dueDate);

  const handleDateChange = (date) => {
    onUpdate(subtask.id, { dueDate: date ? date.toISOString() : null });
    setDatePickerOpen(false);
  };

  const handleAssigneeSelect = (email) => {
    onUpdate(subtask.id, { assigneeEmail: email });
  };

  const assigneeMenu = (
    <Menu className="bg-ki-black border border-border-ki text-pearl-white">
      {subtask.assigneeEmail && (
        <Menu.Item key="clear" onClick={() => handleAssigneeSelect(null)}>
          Sin responsable
        </Menu.Item>
      )}
      {members?.map((member, i) => (
        <Menu.Item key={i} onClick={() => handleAssigneeSelect(member.email)}>
          <div className="flex items-center gap-2">
            <Avatar
              src={member.photoURL}
              icon={!member.photoURL && <UserOutlined />}
              size={20}
              className="bg-ki-purple flex-shrink-0"
            />
            <span>{member.displayName || member.email}</span>
          </div>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <>
      <div className="mb-3 rounded-md bg-dark-blue border border-border-ki">
        <div className="flex items-center gap-2 px-4 py-3 text-pearl-white">
          {/* Título — izquierda, abre panel completo */}
          <div
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            onClick={() => setPanelOpen(true)}
          >
            <DoneToggle
              done={!!subtask.done}
              size="sm"
              onClick={() =>
                onUpdate(
                  subtask.id,
                  buildDoneUpdate(!subtask.done, currentUser, {
                    doneAt: subtask.doneAt,
                    doneBy: subtask.doneBy,
                  })
                )
              }
            />
            <span className={`font-medium truncate block ${subtask.done ? "line-through text-light-gray" : ""}`}>
              {subtask.title || (
                <span className="text-light-gray italic text-sm">Sin título</span>
              )}
            </span>
          </div>

          {/* Fecha — justo antes del miembro */}
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              title="Fecha de entrega"
              onClick={() => setDatePickerOpen(true)}
              className="flex items-center text-light-gray hover:text-pearl-white transition-colors cursor-pointer bg-transparent border-none text-xs font-medium"
            >
              {dateText ? (
                <span className="text-xs leading-none">{dateText}</span>
              ) : (
                <CalendarOutlined className="text-sm" />
              )}
            </button>
            <DatePicker
              open={datePickerOpen}
              onOpenChange={setDatePickerOpen}
              value={dueDate}
              onChange={handleDateChange}
              format={(value) => (moment().isSame(value, "day") ? "hoy" : value.format("DD MMM"))}
              allowClear
              className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
              dropdownClassName="dark-datepicker"
            />
          </div>

          {/* Responsable — derecha */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Dropdown overlay={assigneeMenu} trigger={["click"]}>
              {assignee ? (
                <Avatar
                  src={assignee.photoURL}
                  icon={!assignee.photoURL && <UserOutlined />}
                  size={28}
                  className="bg-ki-purple cursor-pointer border border-border-ki"
                />
              ) : (
                <button
                  type="button"
                  title="Asignar responsable"
                  className="w-7 h-7 rounded-full flex items-center justify-center border border-border-ki text-light-gray hover:text-pearl-white hover:border-ki-purple bg-ki-black transition-colors cursor-pointer"
                >
                  <UserOutlined className="text-sm" />
                </button>
              )}
            </Dropdown>
          </div>
        </div>
      </div>

      <SubtareaModal
        visible={panelOpen}
        subtask={subtask}
        members={members}
        onClose={() => setPanelOpen(false)}
        onUpdate={onUpdate}
        onDelete={() => {
          setPanelOpen(false);
          onDelete(subtask.id);
        }}
        boardKey={boardKey}
        listKey={listKey}
        tareaKey={tareaKey}
      />
    </>
  );
}
