import { useState, useContext } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { CalendarOutlined, UserOutlined, MenuOutlined } from "@ant-design/icons";
import { Avatar, DatePicker, Dropdown } from "antd";
import moment from "moment";
import dayjs from "dayjs";
import { panelDayjs, toDayjs } from "../../utils/datePicker";
import TareaModal from "../TareaModal";
import DoneToggle from "../DoneToggle";
import { UserContext } from "../../providers/UserProvider";
import { buildDoneUpdate } from "../../utils/completion";

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
  const [pickerValue, setPickerValue] = useState(() => dayjs());
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

  const dueDateMoment = dueDate ? moment(dueDate) : null;
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
    if (date) setPickerValue(panelDayjs(date));
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
        <div className="flex items-center gap-2">
          <Avatar
            src={member.photoURL}
            icon={!member.photoURL && <UserOutlined />}
            size={20}
            className="bg-ki-purple flex-shrink-0"
          />
          <span>{member.displayName || member.email}</span>
        </div>
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
              <MenuOutlined className="text-base" />
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
                  {dateText ? (
                    <span className="leading-none">{dateText}</span>
                  ) : (
                    <CalendarOutlined className="text-base" />
                  )}
                </button>
                <DatePicker
                  open={datePickerOpen}
                  onOpenChange={(open) => {
                    setDatePickerOpen(open);
                    if (open) setPickerValue(panelDayjs(dueDate));
                  }}
                  defaultPickerValue={panelDayjs(dueDate)}
                  pickerValue={pickerValue}
                  onPickerValueChange={setPickerValue}
                  value={toDayjs(dueDate)}
                  onChange={handleDateChange}
                  format={(value) => (value && dayjs().isSame(value, "day") ? "Hoy" : value?.format("DD MMM"))}
                  allowClear
                  className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
                  classNames={{ popup: { root: "dark-datepicker" } }}
                />
              </div>

              <Dropdown
                menu={{
                  className: "bg-ki-black border border-border-ki text-pearl-white",
                  items: assigneeMenuItems,
                }}
                trigger={["click"]}
              >
                {assignee ? (
                  <Avatar
                    src={assignee.photoURL}
                    icon={!assignee.photoURL && <UserOutlined />}
                    size={28}
                    className="bg-ki-purple cursor-pointer border border-border-ki flex-shrink-0"
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
