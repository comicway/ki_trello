import { useState, useEffect } from "react";
import { Button, Modal, Input } from "antd";
import {
  TagOutlined,
  ProjectOutlined,
  AlignLeftOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;

export default function CardModal(props) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState("");
  const {
    visible,
    cardTitle,
    handleHideModal,
    cardDescription,
    handleEditCard,
    cardKey,
    listKey,
  } = props;

  useEffect(() => {
    setDescription(cardDescription);
  }, []);

  const handleEnableEditing = () => {
    setEditing(true);
  };

  const handleDisableEditing = () => {
    setEditing(false);
    setDescription("");
  };

  const handleInputChange = (e) => {
    setDescription(e.target.value);
  };

  const handleSubmitForm = (event, callback, listKey, cardKey) => {
    event.preventDefault();

    const updatedCard = {
      title: cardTitle,
      description: description ? description : "",
    };
    callback({ listKey, cardKey, card: updatedCard }).then(() => {
      handleDisableEditing();
    });
  };
  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-pearl-white">
          <ProjectOutlined />
          <span className="font-semibold text-base">{cardTitle}</span>
        </div>
      }
      visible={visible}
      onCancel={() => {
        handleHideModal();
        handleDisableEditing();
      }}
      footer={null}
      className="dark-modal"
    >
      {/* Labels */}
      <div className="mb-6">
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <TagOutlined />
          <span>Labels</span>
        </h4>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded text-xs font-semibold bg-green-700 text-pearl-white hover:bg-green-600 transition-colors">
            Low
          </button>
          <button className="px-3 py-1 rounded text-xs font-semibold text-pearl-white transition-colors" style={{ backgroundColor: "#ebc36a" }}>
            Medium
          </button>
          <button className="px-3 py-1 rounded text-xs font-semibold text-pearl-white transition-colors" style={{ backgroundColor: "#c74235" }}>
            High
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-3">
          <AlignLeftOutlined />
          <span>Description</span>
        </h4>
        <div>
          {editing ? (
            <form
              onSubmit={(event) =>
                handleSubmitForm(event, handleEditCard, listKey, cardKey)
              }
            >
              <TextArea
                value={description}
                onChange={(e) => handleInputChange(e)}
                placeholder={
                  description === ""
                    ? "Add a more detailed description..."
                    : description
                }
                autoFocus
                className="bg-ki-black text-pearl-white border-border-ki rounded mb-3 resize-none"
                rows={4}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-1.5 bg-ki-purple border border-border-ki text-pearl-white rounded text-sm font-medium hover:bg-ki-pastel transition-colors"
                  onClick={(event) =>
                    handleSubmitForm(event, handleEditCard, listKey, cardKey)
                  }
                >
                  Save
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-transparent border border-border-ki text-light-gray rounded text-sm font-medium hover:border-alert-danger hover:text-alert-danger transition-colors"
                  onClick={handleDisableEditing}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              onClick={handleEnableEditing}
              className="bg-ki-black border border-border-ki rounded px-4 py-3 text-light-gray cursor-pointer hover:border-ki-purple transition-colors min-h-[60px]"
            >
              {cardDescription ? (
                <span className="text-pearl-white">{cardDescription}</span>
              ) : (
                <span className="italic text-light-gray text-sm">Add a more detailed description...</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
