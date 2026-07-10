"use client";

import { useEffect } from "react";

const isChunkLoadError = (error) =>
  error?.name === "ChunkLoadError" ||
  String(error?.message || "").includes("Loading chunk");

export default function Error({ error, reset }) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;

    const reloaded = sessionStorage.getItem("kitrello-chunk-reload");
    if (!reloaded) {
      sessionStorage.setItem("kitrello-chunk-reload", "1");
      window.location.reload();
    }
  }, [error]);

  useEffect(() => {
    sessionStorage.removeItem("kitrello-chunk-reload");
  }, []);

  if (isChunkLoadError(error)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-pearl-white p-6">
        <p className="text-sm text-light-gray">Actualizando la aplicación…</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-ki-purple rounded text-sm font-medium border-none cursor-pointer"
        >
          Recargar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-pearl-white p-6">
      <p className="text-sm text-alert-danger">Algo salió mal.</p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 bg-ki-purple rounded text-sm font-medium border-none cursor-pointer"
      >
        Reintentar
      </button>
    </div>
  );
}
