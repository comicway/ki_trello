import { useState } from "react";
import { Button, Input } from "antd";

export default function CreateTarea(props) {
  const [tareaTitle, setTareaTitle] = useState("");
  const { listKey, handleCreateTarea, creatingTarea, handleCreatingTarea } = props;

  const handleOnSubmit = (event) => {
    event.preventDefault();
    if (tareaTitle !== "") {
      handleCreateTarea({ tareaTitle, listKey });
      setTareaTitle("");
      handleCreatingTarea(false);
    }
  };

  const { TextArea } = Input;

  return (
    <div className="flex rounded-md font-medium my-1 w-full">
      {creatingTarea ? (
        <div className="pb-1 w-full">
          <TextArea
            className="w-full resize-none outline-none rounded-md bg-ki-black border border-border-ki px-4 py-3 font-medium mb-3 text-pearl-white placeholder-light-gray"
            value={tareaTitle}
            placeholder="Enter the title for this tarea..."
            onSubmit={(event) => handleOnSubmit(event)}
            rows={2}
            onChange={(e) => setTareaTitle(e.target.value)}
            autoFocus
          />
          <div className="flex items-center">
            <button
              className="bg-ki-purple border border-border-ki rounded-md font-medium px-4 py-1.5 text-pearl-white mr-2 hover:bg-ki-pastel transition-colors"
              onClick={(event) => handleOnSubmit(event)}
            >
              Create
            </button>
            <button
              className="border border-border-ki rounded-full text-light-gray bg-transparent hover:bg-alert-danger hover:border-alert-danger hover:text-pearl-white font-medium w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
              onClick={() => {
                setTareaTitle("");
                handleCreatingTarea(false);
              }}
            >
              X
            </button>
          </div>
        </div>
      ) : (
        <a 
          className="text-center text-sm rounded-md text-light-gray block flex-1 py-2 cursor-pointer select-none bg-dark-blue border border-border-ki hover:bg-ki-black hover:text-ki-orange transition-colors"
          onClick={handleCreatingTarea}
        >
          + Add Tarea
        </a>
      )}
    </div>
  );
}
