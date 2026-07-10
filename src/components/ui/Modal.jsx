"use client";

import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, width = "420px" }) {
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
    <div className="fixed inset-0 z-[1100] flex items-start justify-center px-4 pt-16">
      <button type="button" aria-label="Cerrar modal" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full bg-ki-black border border-border-ki rounded-lg p-6 shadow-xl"
        style={{ maxWidth: width }}
      >
        {title && <div className="mb-4 text-pearl-white">{title}</div>}
        {children}
      </div>
    </div>
  );
}
