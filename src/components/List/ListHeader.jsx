import { useState, useEffect } from "react";
import { Dropdown, Button, Space, Input } from "antd";
import { MoreOutlined } from "@ant-design/icons";

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

  const listMenu = {
    className: "bg-ki-black border border-border-ki text-pearl-white rounded-md",
    items: [
      {
        key: "delete",
        label: "Delete this list",
        className: "hover:bg-alert-danger hover:text-pearl-white rounded",
        onClick: () => handleDeleteList(listKey),
      },
    ],
  };

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
          <Input
            type="text"
            value={listHeader}
            onChange={(e) => handleInputChange(e)}
            autoFocus
            className="text-lg px-2 rounded bg-dark-blue text-pearl-white border-border-ki"
          />
        </form>
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="max-w-[200px] overflow-hidden block text-ellipsis text-pearl-white cursor-pointer font-medium"
              onClick={() => handleEnableEdit()}
            >
              {title}
            </div>
            <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-dark-blue border border-border-ki text-light-gray text-xs font-medium">
              {tareaCount}
            </span>
          </div>
        </>
      )}
      <Space direction="vertical">
        <Space wrap>
          <Dropdown
            menu={listMenu}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button
              shape="circle"
              icon={
                <MoreOutlined
                  style={{ transform: "rotate(90deg)", fontSize: 22 }}
                />
              }
              className="text-[18px] pr-[2px] bg-transparent border-none shadow-none text-light-gray hover:bg-dark-blue hover:text-pearl-white flex items-center justify-center"
            />
          </Dropdown>
        </Space>
      </Space>
    </div>
  );
}
