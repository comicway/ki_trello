import { auth } from "./firebase";

export const getUser = () => auth.currentUser;

export const requireAuthUser = () => {
  const user = auth.currentUser;
  if (!user?.uid || !user?.email) {
    throw new Error("Usuario no autenticado.");
  }
  return user;
};

// Espera a que Firebase resuelva el estado de auth antes de devolver el usuario.
// Evita race conditions cuando auth.currentUser todavía es null al montar.
export const waitForAuthUser = () =>
  new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      if (user?.uid && user?.email) resolve(user);
      else reject(new Error("Usuario no autenticado."));
    });
  });
