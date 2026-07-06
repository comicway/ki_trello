import { useState } from "react";
import { inputClass } from "../ui/styles";

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

  return (
    <div className="flex rounded-md font-medium my-1 w-full">
      {creatingTarea ? (
        <div className="pb-1 w-full">
          <textarea
            className={`${inputClass} resize-none mb-3`}
            value={tareaTitle}
            placeholder="Enter the title for this tarea..."
            rows={2}
            onChange={(e) => setTareaTitle(e.target.value)}
            autoFocus
          />
          <div className="flex items-center">
            <button
              type="button"
              className="bg-ki-purple border border-border-ki rounded-md font-medium px-4 py-1.5 text-pearl-white mr-2 hover:bg-ki-pastel transition-colors cursor-pointer"
              onClick={handleOnSubmit}
            >
              Create
            </button>
            <button
              type="button"
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
        <button
          type="button"
          className="text-center text-sm rounded-md text-light-gray block flex-1 py-2 cursor-pointer select-none bg-dark-blue border border-border-ki hover:bg-ki-black hover:text-ki-orange transition-colors"
          onClick={handleCreatingTarea}
        >
          + Add Tarea
        </button>
      )}
    </div>
  );
}
