"use client";

import Nav from "@/components/Nav";
import Account from "@/views/Account";
import PrivateRoute from "@/components/PrivateRoute";

export default function AccountPage() {
  return (
    <PrivateRoute>
      <Nav />
      <Account />
    </PrivateRoute>
  );
}
