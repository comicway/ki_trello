import Link from "next/link";
import { useContext } from "react";
import { auth } from "../../firebase";
import { UserContext } from "../../providers/UserProvider";
import MemberAvatar from "../MemberAvatar";
import { HomeIcon, LogoutIcon } from "../ui/icons";

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
    <nav className="relative flex justify-between items-center px-4 py-3 border-b border-border-ki bg-ki-black">
      <div>
        <Link
          href="/boards"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-ki text-pearl-white hover:border-ki-orange hover:text-ki-orange transition-colors"
          title="Home"
        >
          <HomeIcon className="h-5 w-5" />
        </Link>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center">
        <img
          src="/logo-kitechnologies-white.svg"
          alt="Logo de Ki technologies"
          className="h-8 w-auto max-h-8 object-contain"
        />
      </div>

      {member && (
        <div className="flex items-center gap-2">
          <Link href="/account" title="Account" className="inline-flex rounded-full">
            <MemberAvatar member={member} size={38} borderClass="border-border-ki" />
          </Link>
          <button
            type="button"
            onClick={auth.doSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-10 h-10 rounded-full flex items-center justify-center border border-border-ki text-light-gray hover:text-ki-orange hover:border-ki-orange bg-transparent cursor-pointer transition-colors"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </nav>
  );
}
