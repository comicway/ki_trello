import { CheckOutlined } from "@ant-design/icons";

export default function DoneToggle({ done = false, onClick, size = "md" }) {
  const px = size === "sm" ? 20 : 24;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={done ? "Marcar como pendiente" : "Marcar como finalizado"}
      className="flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer border-none"
      style={{
        width: px,
        height: px,
        fontSize: size === "sm" ? 10 : 12,
        backgroundColor: done ? "#FF7900" : "transparent",
        border: done ? "none" : "2px dashed #4a5568",
        color: done ? "#ffffff" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!done) e.currentTarget.style.borderColor = "#FF7900";
      }}
      onMouseLeave={(e) => {
        if (!done) e.currentTarget.style.borderColor = "#4a5568";
      }}
    >
      {done && <CheckOutlined />}
    </button>
  );
}
