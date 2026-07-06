"use client";

import { useEffect, useRef, useState } from "react";

export const TASK_COUNTRIES = [
  { code: "CL", name: "Chile", flag: "https://flagcdn.com/w40/cl.png" },
  { code: "CO", name: "Colombia", flag: "https://flagcdn.com/w40/co.png" },
  { code: "PE", name: "Perú", flag: "https://flagcdn.com/w40/pe.png" },
];

const getCountry = (code) => TASK_COUNTRIES.find((c) => c.code === code);

export const CountryFlag = ({ code, size = 20 }) => {
  const country = getCountry(code);
  if (!country) return null;
  return (
    <img
      src={country.flag}
      alt=""
      className="rounded-full object-cover border border-border-ki shrink-0"
      style={{ width: size, height: size }}
    />
  );
};

const CountryOption = ({ code }) => {
  const country = getCountry(code);
  if (!country) return null;
  return (
    <span className="flex items-center gap-2">
      <CountryFlag code={code} />
      <span>{country.name}</span>
    </span>
  );
};

export default function CountrySelect({ value, onChange, className = "w-full" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = getCountry(value);

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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-[#22272b] border border-border-ki text-pearl-white rounded px-3 py-2 text-sm flex items-center justify-between hover:border-ki-purple transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          {selected ? (
            <CountryOption code={selected.code} />
          ) : (
            <span className="text-light-gray">Seleccionar país</span>
          )}
        </div>
        <span className="text-light-gray text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full bg-[#282e33] border border-border-ki rounded shadow-xl overflow-hidden">
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
            <span>Sin país</span>
          </button>
          {TASK_COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-pearl-white hover:bg-ki-black transition-colors cursor-pointer text-left"
              onClick={() => {
                onChange(country.code);
                setIsOpen(false);
              }}
            >
              <CountryOption code={country.code} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
