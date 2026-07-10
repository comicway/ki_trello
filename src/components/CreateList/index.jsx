import { useState } from "react";
import { inputClass } from "../ui/styles";

export default function CreateList({ handleCreateList, vertical = false }) {
  const [listTitle, setListTitle] = useState("");
  const [editing, setEditing] = useState(false);

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!listTitle.trim()) return;
    handleCreateList(listTitle.trim());
    setEditing(false);
    setListTitle("");
  };

  const inputExtra = vertical
    ? "min-h-[48px] box-border"
    : "min-w-[284px] mx-1 inline-block min-h-[48px] box-border";

  const buttonClass = vertical
    ? "w-full font-medium bg-dark-blue border border-dashed border-border-ki rounded-md min-h-[48px] py-2 px-3 text-sm text-light-gray hover:bg-ki-black hover:text-pearl-white hover:border-ki-purple transition-colors cursor-pointer"
    : "min-w-[292px] mx-1 inline-block font-medium bg-dark-blue border border-border-ki rounded-md min-h-[48px] py-1 px-3 text-sm text-pearl-white hover:bg-ki-black hover:text-ki-orange transition-colors hover:border-ki-orange cursor-pointer";

  return (
    <div className={vertical ? "w-full" : undefined}>
      {editing ? (
        <form onBlur={() => setEditing(false)} onSubmit={handleSubmitForm}>
          <input
            placeholder="Nombre de la lista..."
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            autoFocus
            className={`${inputClass} ${inputExtra}`}
          />
        </form>
      ) : (
        <button type="button" className={buttonClass} onClick={() => setEditing(true)}>
          + Añadir lista
        </button>
      )}
    </div>
  );
}
