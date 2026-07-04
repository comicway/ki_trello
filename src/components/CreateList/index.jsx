import { useState } from "react";
import { Button, Input } from "antd";

export default function CreateList({ handleCreateList, vertical = false }) {
  const [listTitle, setListTitle] = useState("");
  const [editing, setEditing] = useState(false);

  const handleEnableEditing = () => setEditing(true);
  const handleDisableEditing = () => setEditing(false);
  const handleInputChange = (e) => setListTitle(e.target.value);

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!listTitle.trim()) return;
    handleCreateList(listTitle.trim());
    setEditing(false);
    setListTitle("");
  };

  const inputClass = vertical
    ? "w-full font-medium bg-ki-black text-pearl-white border-border-ki rounded-md min-h-[48px] text-sm box-border px-3"
    : "min-w-[284px] mx-1 inline-block font-medium bg-ki-black text-pearl-white border-border-ki rounded-md min-h-[48px] text-sm box-border px-3";

  const buttonClass = vertical
    ? "w-full font-medium bg-dark-blue border border-dashed border-border-ki rounded-md min-h-[48px] py-2 px-3 text-sm text-light-gray hover:bg-ki-black hover:text-pearl-white hover:border-ki-purple transition-colors"
    : "min-w-[292px] mx-1 inline-block font-medium bg-dark-blue border border-border-ki rounded-md min-h-[48px] py-1 px-3 text-sm text-pearl-white hover:bg-ki-black hover:text-ki-orange transition-colors hover:border-ki-orange";

  return (
    <div className={vertical ? "w-full" : undefined}>
      {editing ? (
        <form onBlur={handleDisableEditing} onSubmit={handleSubmitForm}>
          <Input
            placeholder="Create a new list..."
            value={listTitle}
            onChange={handleInputChange}
            autoFocus
            className={inputClass}
          />
        </form>
      ) : (
        <Button className={buttonClass} onClick={handleEnableEditing}>
          + Add another list
        </Button>
      )}
    </div>
  );
}
