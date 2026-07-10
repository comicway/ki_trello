"use client";

import { useEffect, useRef, useState } from "react";
import { TASK_COUNTRIES, CountryFlag } from "../CountrySelect";

export const viewTabButtonClass = (active) =>
  `px-3 py-1 text-sm font-medium rounded transition-colors bg-transparent border-none cursor-pointer ${
    active ? "text-ki-orange" : "text-light-gray hover:text-pearl-white"
  }`;

export default function CountryFilterButton({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (value) {
    return (
      <button
        type="button"
        onClick={() => onChange(null)}
        className={viewTabButtonClass(true)}
      >
        Limpiar filtro
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={viewTabButtonClass(false)}
      >
        Filtro
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-20 mt-1 min-w-[168px] rounded-md border border-border-ki bg-ki-black py-1 shadow-lg">
          {TASK_COUNTRIES.map((country) => (
            <li key={country.code}>
              <button
                type="button"
                onClick={() => {
                  onChange(country.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-pearl-white transition-colors hover:bg-dark-blue"
              >
                <CountryFlag code={country.code} />
                {country.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
