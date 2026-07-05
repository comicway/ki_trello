import { useState, useEffect } from "react";
import Dropdown from "../ui/Dropdown";
import { inputClass } from "../ui/styles";
import { MoreIcon } from "../ui/icons";

export default function ListHeader(props) {
  const [listHeader, setListHeader] = useState("");
  const [editing, setEditing] = useState(false);

  const { title, listKey, tareaCount = 0, handleUpdateList, handleDeleteList } = props;

  useEffect(() => {
    setListHeader(title);
  }, []);

  const handleInputChange = (e) => {
    e.preventDefault();
    setListHeader(e.target.value);
  };

  const handleEnableEdit = () => {
    setEditing(true);
    setListHeader(title);
  };

  const handleFormSubmit = (event, callback, listKey, listTitle) => {
    event.preventDefault();

    if (listHeader !== "") {
      callback(listKey, listTitle).then(() => {
        setListHeader("");
        setEditing(false);
      });
    }
  };

  const listMenuItems = [
    {
      key: "delete",
      label: "Delete this list",
      className: "hover:bg-alert-danger hover:text-pearl-white",
      onClick: () => handleDeleteList(listKey),
    },
  ];

  return (
    <div className="flex items-center justify-between text-lg mb-3 px-4 whitespace-normal">
      {editing ? (
        <form
          onSubmit={(event) =>
            handleFormSubmit(event, handleUpdateList, listKey, listHeader)
          }
          onBlur={(event) =>
            handleFormSubmit(event, handleUpdateList, listKey, listHeader)
          }
        >
          <input
            type="text"
            value={listHeader}
            onChange={handleInputChange}
            autoFocus
            className={`${inputClass} text-lg px-2 bg-dark-blue`}
          />
        </form>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="max-w-[200px] overflow-hidden block text-ellipsis text-pearl-white cursor-pointer font-medium"
            onClick={handleEnableEdit}
          >
            {title}
          </div>
          <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-dark-blue border border-border-ki text-light-gray text-xs font-medium">
            {tareaCount}
          </span>
        </div>
      )}
      <Dropdown
        align="right"
        items={listMenuItems}
        trigger={
          <button
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-light-gray hover:bg-dark-blue hover:text-pearl-white bg-transparent border-none cursor-pointer transition-colors"
          >
            <MoreIcon className="h-5 w-5 rotate-90" />
          </button>
        }
      />
    </div>
  );
}
