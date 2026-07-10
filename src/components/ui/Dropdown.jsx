"use client";

import { useState, useRef, useEffect } from "react";

export default function Dropdown({ trigger, items = [], align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <div onClick={() => setOpen((v) => !v)} className="inline-flex">{trigger}</div>
      {open && (
        <ul
          className={`absolute z-50 mt-1 min-w-[180px] max-h-64 overflow-y-auto bg-ki-black border border-border-ki rounded-md shadow-lg py-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm text-pearl-white hover:bg-dark-blue transition-colors ${
                  item.className || ""
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
