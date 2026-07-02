import { useState } from "react";
import { Button, Input } from "antd";

export default function CreateList(props) {
  const [listTitle, setListTitle] = useState("");
  const [editing, setEditing] = useState(false);

  const { handleCreateList } = props;

  const handleEnableEditing = () => {
    setEditing(true);
  };

  const handleDisableEditing = () => {
    setEditing(false);
  };

  const handleInputChange = (e) => {
    setListTitle(e.target.value);
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    handleCreateList(listTitle);
    setEditing(false);
    setListTitle("");
  };
  return (
    <div>
      {editing ? (
        <form
          onBlur={handleDisableEditing}
          onSubmit={(e) => handleSubmitForm(e)}
        >
          <Input
            placeholder="Create a new list..."
            onChange={(e) => handleInputChange(e)}
            autoFocus
            className="min-w-[284px] mx-1 inline-block font-medium bg-ki-black text-pearl-white border-border-ki rounded-md min-h-[48px] text-sm box-border px-3"
          />
        </form>
      ) : (
        <Button className="min-w-[292px] mx-1 inline-block font-medium bg-dark-blue border border-border-ki rounded-md min-h-[48px] py-1 px-3 text-sm text-pearl-white hover:bg-ki-black hover:text-ki-orange transition-colors hover:border-ki-orange" onClick={handleEnableEditing}>
          + Add another list
        </Button>
      )}
    </div>
  );
}
