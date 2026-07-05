"use client";

import { useEffect } from "react";
import "@ant-design/v5-patch-for-react-19";
import { ConfigProvider } from "antd";
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

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: "#1d2125",
          colorBgElevated: "#22272b",
          colorText: "#b6c2cf",
          colorBorder: "#2d3147",
          colorPrimary: "#7c6dd8",
        },
      }}
    >
      <UserProvider>{children}</UserProvider>
    </ConfigProvider>
  );
}
