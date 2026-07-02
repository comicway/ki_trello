import { useState, useEffect } from "react";
import { Draggable } from "react-beautiful-dnd";
import { Button, Input } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import CardModal from "../CardModal";


export default function Card(props) {
  const [showModal, setShowModal] = useState(false);
  const [showIcons, setShowIcons] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cardTitle, setCardTitle] = useState("");

  const {
    index,
    title,
    description,
    cardKey,
    listKey,
    handleEditCard,
    handleDeleteCard,
  } = props;

  useEffect(() => {
    setCardTitle(title);
    console.log(props);
  }, []);

  const handleTitleChange = (e) => {
    setCardTitle(e.target.value);
  };

  const handleShowIcons = () => {
    setShowIcons(true);
  };

  const handleHideIcons = () => {
    setShowIcons(false);
  };

  const handleEnableEditing = () => {
    setEditing(true);
  };

  const handleDisableEditing = () => {
    setEditing(false);
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleHideModal = () => {
    setShowModal(false);
  };

  const handleSubmitForm = (event, callback, listKey, cardKey, title) => {
    event.preventDefault();

    const card = { title: cardTitle };
    callback({ listKey, cardKey, card }).then(() => setEditing(false));
  };

  const onDeleteCard = (callback, listKey, cardKey) => {
    callback({ listKey, cardKey });
  };

  return (
    <>
      <Draggable draggableId={String(cardKey)} index={index}>
        {(provided) => (
          <>
              <div
              className="mb-3 rounded-md bg-dark-blue border border-border-ki cursor-pointer"
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              ref={provided.innerRef}
              onMouseEnter={handleShowIcons}
              onMouseLeave={handleHideIcons}
              onBlur={handleDisableEditing}
            >
              <div className="relative font-medium px-4 py-3 text-pearl-white">
                {editing ? (
                  <form
                    onSubmit={(event) =>
                      handleSubmitForm(
                        event,
                        handleEditCard,
                        listKey,
                        cardKey,
                        title
                      )
                    }
                  >
                    <Input
                      className="bg-ki-black text-pearl-white border-border-ki"
                      value={cardTitle}
                      onChange={(event) => handleTitleChange(event)}
                      autoFocus
                    />
                  </form>
                ) : (
                  <div onClick={() => handleShowModal()}>
                    {showIcons && (
                      <div
                        className="absolute top-[7px] right-[8px] flex gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          onClick={handleEnableEditing}
                          icon={<EditOutlined />}
                          className="bg-transparent border-none text-light-gray hover:bg-ki-black hover:text-pearl-white flex items-center justify-center p-1"
                        ></Button>
                        <Button
                          onClick={() =>
                            onDeleteCard(handleDeleteCard, listKey, cardKey)
                          }
                          icon={<DeleteOutlined />}
                          className="bg-transparent border-none text-light-gray hover:bg-ki-black hover:text-pearl-white flex items-center justify-center p-1"
                        ></Button>
                      </div>
                    )}
                    <div>{title}</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Draggable>
      <CardModal
        visible={showModal}
        cardTitle={cardTitle}
        cardDescription={description}
        cardKey={cardKey}
        listKey={listKey}
        handleEditCard={handleEditCard}
        handleHideModal={handleHideModal}
      />
    </>
  );
}
