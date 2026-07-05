"use client";

import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Board from "@/views/Board";
import PrivateRoute from "@/components/PrivateRoute";

export default function BoardPage() {
  const params = useParams();

  return (
    <PrivateRoute>
      <Nav />
      <Board boardId={params.id} />
    </PrivateRoute>
  );
}
