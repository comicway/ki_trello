"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Drawer({ open, onClose, width = 520, zIndex = 1200, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 isolate" style={{ zIndex }}>
      <button
        type="button"
        aria-label="Cerrar panel"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 flex h-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-auto bg-[#1d2125] text-light-gray p-6 box-border relative"
        style={{ width: Math.min(width, typeof window !== "undefined" ? window.innerWidth : width) }}
      >
        {children}
      </aside>
    </div>,
    document.body
  );
}
