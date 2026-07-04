import { Link } from "react-router-dom";
import { useContext } from "react";
import { Button } from "antd";
import { HomeOutlined, LogoutOutlined } from "@ant-design/icons";
import { auth } from "../../firebase";
import { UserContext } from "../../providers/UserProvider";
import MemberAvatar from "../MemberAvatar";

export default function Nav() {
  const currentUser = useContext(UserContext);

  const member = currentUser
    ? {
        photoURL: currentUser.photoURL,
        displayName: currentUser.displayName,
        email: currentUser.email,
      }
    : null;

  return (
    <nav className="flex justify-between items-center px-4 py-3 border-b border-border-ki bg-ki-black">
      <div>
        <Link to="/boards">
          <Button
            size="large"
            className="bg-transparent border-border-ki text-pearl-white hover:bg-transparent hover:border-ki-orange hover:text-ki-orange transition-colors flex items-center justify-center"
            icon={<HomeOutlined style={{ fontSize: "1.25rem" }} />}
          />
        </Link>
      </div>

      {member && (
        <div className="flex items-center gap-2">
          <Link to="/account" title="Account" className="inline-flex rounded-full">
            <MemberAvatar member={member} size={38} borderClass="border-border-ki" />
          </Link>
          <button
            type="button"
            onClick={auth.doSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-10 h-10 rounded-full flex items-center justify-center border border-border-ki text-light-gray hover:text-ki-orange hover:border-ki-orange bg-transparent cursor-pointer transition-colors"
          >
            <LogoutOutlined style={{ fontSize: "1.25rem" }} />
          </button>
        </div>
      )}
    </nav>
  );
}
