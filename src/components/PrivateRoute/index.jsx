"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { firebase } from "@/firebase";

export default function PrivateRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = firebase.auth.onAuthStateChanged((user) => {
      setAuthenticated(!!user);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!loadingAuth && !authenticated) {
      router.replace("/sign-in");
    }
  }, [loadingAuth, authenticated, router]);

  if (loadingAuth) return <Loader />;
  if (!authenticated) return null;
  return children;
}
