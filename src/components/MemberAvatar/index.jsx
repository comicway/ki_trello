import { useState } from "react";
import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";

export default function MemberAvatar({ member, size = 32, className = "", borderClass = "border-dark-blue" }) {
  const [imgError, setImgError] = useState(false);
  const photoURL = member?.photoURL || null;
  const showPhoto = photoURL && !imgError;

  if (showPhoto) {
    return (
      <img
        src={photoURL}
        alt={member?.displayName || member?.email || ""}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`rounded-full object-cover border-2 ${borderClass} flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Avatar
      size={size}
      icon={<UserOutlined />}
      className={`bg-ki-purple border-2 ${borderClass} flex-shrink-0 ${className}`}
    />
  );
}
