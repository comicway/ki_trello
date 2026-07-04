import { CheckOutlined } from "@ant-design/icons";
import moment from "moment";

export default function DoneFooter({ doneBy, doneAt, label = "Tarea Finalizada" }) {
  if (!doneAt) return null;

  const day = moment(doneAt).format("DD [de] MMMM");
  const time = moment(doneAt).format("HH:mm");

  return (
    <div className="mt-8 pt-6 border-t border-border-ki flex items-center gap-3">
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
        style={{ backgroundColor: "#FF7900" }}
      >
        <CheckOutlined />
      </div>
      <p className="text-light-gray text-sm m-0">
        {label}
        {doneBy && (
          <>
            {" por: "}
            <span className="text-pearl-white font-medium">{doneBy}</span>
          </>
        )}
        {" el "}
        <span className="text-pearl-white">{day}</span>
        {" a las "}
        <span className="text-pearl-white">{time}</span>
      </p>
    </div>
  );
}
