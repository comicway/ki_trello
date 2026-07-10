import { useState, useRef, useEffect } from "react";
import MemberAvatar from "../MemberAvatar";

export default function AssigneeSelect({ members, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedMember = members?.find((m) => m.email === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#22272b] border border-border-ki text-pearl-white rounded px-3 py-2 text-sm flex items-center justify-between hover:border-ki-purple transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedMember ? (
            <>
              <MemberAvatar member={selectedMember} size={20} borderClass="border-[#22272b]" />
              <span className="truncate">{selectedMember.displayName || selectedMember.email}</span>
            </>
          ) : (
            <span className="text-light-gray">Sin responsable asignado</span>
          )}
        </div>
        <span className="text-light-gray text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full bg-[#282e33] border border-border-ki rounded shadow-xl max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-ki-black-500 [&::-webkit-scrollbar-thumb]:rounded-full">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-light-gray hover:bg-ki-black hover:text-pearl-white transition-colors cursor-pointer text-left"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
          >
            <div className="w-[20px] h-[20px] rounded-full border border-dashed border-light-gray flex items-center justify-center shrink-0">
              <span className="text-[10px]">✕</span>
            </div>
            <span>Sin responsable asignado</span>
          </button>
          {members?.map((member) => (
            <button
              key={member.email}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-pearl-white hover:bg-ki-black transition-colors cursor-pointer text-left"
              onClick={() => {
                onChange(member.email);
                setIsOpen(false);
              }}
            >
              <MemberAvatar member={member} size={20} borderClass="border-[#282e33]" />
              <span className="truncate">{member.displayName || member.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
