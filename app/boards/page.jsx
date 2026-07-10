"use client";

import dynamic from "next/dynamic";
import Nav from "@/components/Nav";
import PrivateRoute from "@/components/PrivateRoute";
import Loader from "@/components/Loader";

const Boards = dynamic(() => import("@/views/Boards"), {
  loading: () => <Loader />,
});

export default function BoardsPage() {
  return (
    <PrivateRoute>
      <Nav />
      <Boards />
    </PrivateRoute>
  );
}
