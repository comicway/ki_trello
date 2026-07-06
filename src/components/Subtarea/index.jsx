import { useState, useContext } from "react";
import moment from "moment";
import SubtareaModal from "../SubtareaModal";
import DoneToggle from "../DoneToggle";
import MemberAvatar from "../MemberAvatar";
import Dropdown from "../ui/Dropdown";
import DateField from "../ui/DateField";
import { UserContext } from "../../providers/UserProvider";
import { buildDoneUpdate } from "../../utils/completion";
import { CalendarIcon, UserIcon } from "../ui/icons";

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

  const assigneeMenuItems = [
    ...(subtask.assigneeEmail
      ? [{ key: "clear", label: "Sin responsable", onClick: () => handleAssigneeSelect(null) }]
      : []),
    ...(members?.map((member, i) => ({
      key: member.email || String(i),
      label: (
        <span className="flex items-center gap-2">
          <MemberAvatar member={member} size={20} borderClass="border-ki-black" />
          <span>{member.displayName || member.email}</span>
        </span>
      ),
      onClick: () => handleAssigneeSelect(member.email),
    })) || []),
  ];

  return (
    <>
      <div className="mb-3 rounded-md bg-dark-blue border border-border-ki">
        <div className="flex items-center gap-2 px-4 py-3 text-pearl-white">
          <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => setPanelOpen(true)}>
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
              {subtask.title || <span className="text-light-gray italic text-sm">Sin título</span>}
            </span>
          </div>

          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              title="Fecha de entrega"
              onClick={() => setDatePickerOpen(true)}
              className="flex items-center text-light-gray hover:text-pearl-white transition-colors cursor-pointer bg-transparent border-none text-xs font-medium"
            >
              {dateText ? <span className="text-xs leading-none">{dateText}</span> : <CalendarIcon className="h-4 w-4" />}
            </button>
            <DateField
              value={subtask.dueDate}
              open={datePickerOpen}
              onOpenChange={setDatePickerOpen}
              onChange={handleDateChange}
            />
          </div>

          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Dropdown
              items={assigneeMenuItems}
              trigger={
                assignee ? (
                  <button type="button" className="rounded-full border-none bg-transparent p-0 cursor-pointer">
                    <MemberAvatar member={assignee} size={28} borderClass="border-border-ki" />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Asignar responsable"
                    className="w-7 h-7 rounded-full flex items-center justify-center border border-border-ki text-light-gray hover:text-pearl-white hover:border-ki-purple bg-ki-black transition-colors cursor-pointer"
                  >
                    <UserIcon className="h-3.5 w-3.5" />
                  </button>
                )
              }
            />
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
