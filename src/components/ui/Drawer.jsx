"use client";

import { useEffect } from "react";

export default function Drawer({ open, onClose, width = 520, zIndex = 1000, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      <button type="button" aria-label="Cerrar panel" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside
        className="absolute top-0 right-0 h-full overflow-y-auto bg-[#1d2125] text-light-gray p-6"
        style={{ width }}
      >
        {children}
      </aside>
    </div>
  );
}
