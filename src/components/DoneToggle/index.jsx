import { CheckIcon } from "../ui/icons";

export default function DoneToggle({ done = false, onClick, size = "md" }) {
  const px = size === "sm" ? 20 : 24;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={done ? "Marcar como pendiente" : "Marcar como finalizado"}
      className={`flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer border-2 ${
        done
          ? "bg-ki-orange border-ki-orange text-pearl-white"
          : "bg-transparent border-[#4a5568] text-transparent hover:border-ki-orange"
      }`}
      style={{ width: px, height: px, fontSize: size === "sm" ? 10 : 12 }}
    >
      {done && <CheckIcon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />}
    </button>
  );
}
