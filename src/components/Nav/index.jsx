import { Link } from "react-router-dom";
import { auth } from "../../firebase";
import { Menu, Dropdown, Button, Space, Input } from "antd";
import {
  HomeOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

export default function Nav() {
  const menu = (
    <Menu className="bg-ki-black border border-border-ki text-pearl-white rounded-md">
      <Menu.Item className="hover:bg-alert-danger hover:text-pearl-white rounded">
        <Link to="/account" className="text-pearl-white hover:text-pearl-white flex items-center gap-2">
          <UserOutlined />
          Account
        </Link>
      </Menu.Item>
      <Menu.Item onClick={auth.doSignOut} className="hover:bg-alert-danger hover:text-pearl-white rounded flex items-center gap-2 text-pearl-white">
        <LogoutOutlined />
        Sign out
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <nav className="flex justify-between items-center px-4 py-3 border-b border-border-ki bg-ki-black">
        <div>
          <Link to="/boards">
            <Button
              size="large"
              className="bg-transparent border-border-ki text-pearl-white hover:bg-transparent hover:bg-transparent hover:border-ki-orange hover:text-ki-orange transition-colors flex items-center justify-center"
              icon={
                <HomeOutlined
                  style={{
                    fontSize: "1.25rem",
                  }}
                />
              }
            />
          </Link>
        </div>
        <div>
          <Space direction="vertical">
            <Space wrap>
              <Dropdown
                overlay={menu}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  size="large"
                  className="bg-transparent border-border-ki text-pearl-white hover:bg-transparent hover:border-ki-orange hover:text-ki-orange transition-colors flex items-center justify-center"
                  style={{ paddingTop: "6px" }}
                  icon={
                    <SettingOutlined
                      style={{
                        fontSize: "1.25rem",
                      }}
                    />
                  }
                />
              </Dropdown>
            </Space>
          </Space>
        </div>
      </nav>
    </>
  );
}
