"use client";

import { useEffect, useRef } from "react";
import moment from "moment";

export default function DateField({ value, onChange, open, onOpenChange, className = "sr-only absolute opacity-0 w-0 h-0 overflow-hidden pointer-events-none" }) {
  const ref = useRef(null);
  const iso = value ? moment(value).format("YYYY-MM-DD") : "";

  useEffect(() => {
    if (!open || !ref.current) return;
    ref.current.showPicker?.();
  }, [open]);

  return (
    <input
      ref={ref}
      type="date"
      value={iso}
      onChange={(e) => {
        onChange(e.target.value ? moment(e.target.value) : null);
        onOpenChange?.(false);
      }}
      onBlur={() => onOpenChange?.(false)}
      className={className}
      tabIndex={-1}
    />
  );
}
