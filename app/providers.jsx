"use client";

import { useEffect } from "react";
import UserProvider from "@/providers/UserProvider";

const isChunkLoadError = (reason) =>
  reason?.name === "ChunkLoadError" ||
  String(reason?.message || reason || "").includes("Loading chunk");

export default function Providers({ children }) {
  useEffect(() => {
    const handleRejection = (event) => {
      if (!isChunkLoadError(event.reason)) return;
      if (sessionStorage.getItem("kitrello-chunk-reload")) return;
      sessionStorage.setItem("kitrello-chunk-reload", "1");
      window.location.reload();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    sessionStorage.removeItem("kitrello-chunk-reload");

    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return <UserProvider>{children}</UserProvider>;
}
