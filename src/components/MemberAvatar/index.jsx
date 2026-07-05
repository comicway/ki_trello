import { useState } from "react";
import { UserIcon } from "../ui/icons";

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
    <span
      className={`inline-flex items-center justify-center rounded-full border-2 ${borderClass} bg-ki-purple text-pearl-white flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <UserIcon className={size <= 24 ? "h-3 w-3" : "h-4 w-4"} />
    </span>
  );
}
