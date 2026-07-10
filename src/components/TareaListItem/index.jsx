import { useState, useContext } from "react";
import { Draggable } from "@hello-pangea/dnd";
import moment from "moment";
import TareaModal from "../TareaModal";
import DoneToggle from "../DoneToggle";
import MemberAvatar from "../MemberAvatar";
import Dropdown from "../ui/Dropdown";
import DateField from "../ui/DateField";
import { UserContext } from "../../providers/UserProvider";
import { buildDoneUpdate } from "../../utils/completion";
import { CalendarIcon, MenuIcon, UserIcon } from "../ui/icons";

const dateLabel = (dueDate) => {
  if (!dueDate) return null;
  const date = moment(dueDate);
  if (moment().isSame(date, "day")) return "Hoy";
  return date.format("DD MMM");
};

export default function TareaListItem({
  tarea,
  listKey,
  index,
  boardKey,
  lists,
  members,
  handleEditTarea,
  handleMoveTareaManual,
}) {
  const [showModal, setShowModal] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const currentUser = useContext(UserContext);

  const {
    key: tareaKey,
    title,
    description,
    dueDate,
    country,
    assigneeEmail,
    subtasks,
    done,
    doneAt,
    doneBy,
    readyForSalesforce,
  } = tarea;

  const assignee = members?.find((m) => m.email === assigneeEmail);
  const dateText = dateLabel(dueDate);

  const handleToggleDone = () => {
    const update = buildDoneUpdate(!done, currentUser, { doneAt, doneBy });
    handleEditTarea({ listKey, tareaKey, tarea: update });
  };

  const handleDateChange = (date) => {
    handleEditTarea({
      listKey,
      tareaKey,
      tarea: { dueDate: date ? date.toISOString() : null },
    });
    setDatePickerOpen(false);
  };

  const handleAssigneeSelect = (email) => {
    handleEditTarea({
      listKey,
      tareaKey,
      tarea: { assigneeEmail: email || null },
    });
  };

  const assigneeMenuItems = [
    ...(assigneeEmail
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
      <Draggable draggableId={String(tareaKey)} index={index} isDragDisabled={false}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`flex items-center gap-2 px-4 py-3 border-b border-border-ki transition-colors ${
              done ? "bg-ki-black/50 opacity-70" : "bg-dark-blue hover:bg-ki-black/30"
            } ${snapshot.isDragging ? "shadow-lg ring-1 ring-ki-purple bg-dark-blue" : ""}`}
          >
            <div
              {...provided.dragHandleProps}
              className="flex-shrink-0 text-light-gray hover:text-pearl-white cursor-grab active:cursor-grabbing px-1"
              title="Arrastrar tarea"
            >
              <MenuIcon className="h-4 w-4" />
            </div>

            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <DoneToggle done={!!done} onClick={handleToggleDone} size="sm" />
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={`flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer p-0 ${
                done ? "line-through text-light-gray" : "text-pearl-white"
              }`}
            >
              <span className="font-medium truncate block">{title || "Sin título"}</span>
            </button>

            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <button
                  type="button"
                  title="Fecha de entrega"
                  onClick={() => setDatePickerOpen(true)}
                  className={`flex items-center justify-center min-w-[28px] h-7 transition-colors cursor-pointer bg-transparent border-none text-xs font-medium ${
                    dateText ? "text-ki-orange" : "text-light-gray hover:text-pearl-white"
                  }`}
                >
                  {dateText ? <span className="leading-none">{dateText}</span> : <CalendarIcon className="h-4 w-4" />}
                </button>
                <DateField
                  value={dueDate}
                  open={datePickerOpen}
                  onOpenChange={setDatePickerOpen}
                  onChange={handleDateChange}
                />
              </div>

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
        )}
      </Draggable>

      <TareaModal
        visible={showModal}
        tareaTitle={title}
        tareaDescription={description || ""}
        tareaDueDate={dueDate}
        tareaCountry={country}
        tareaAssigneeEmail={assigneeEmail}
        tareaSubtasks={subtasks || []}
        tareaDone={!!done}
        tareaDoneAt={doneAt}
        tareaDoneBy={doneBy}
        tareaReadyForSalesforce={!!readyForSalesforce}
        tareaKey={tareaKey}
        listKey={listKey}
        boardKey={boardKey}
        lists={lists}
        members={members}
        handleEditTarea={handleEditTarea}
        handleHideModal={() => setShowModal(false)}
        handleMoveTareaManual={handleMoveTareaManual}
      />
    </>
  );
}
