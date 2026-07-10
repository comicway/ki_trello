import firebase from "firebase/app";
import { auth, db, storage } from "./firebase";
import { requireAuthUser } from "./user";

const googleProvider = new firebase.auth.GoogleAuthProvider();

export const doSignInWithGoogle = () => auth.signInWithPopup(googleProvider);

export const doSignOut = () => auth.signOut();

// ─── Email / Password ─────────────────────────────────────────────────────────

export const doSignUpWithEmail = async ({ email, password, displayName }) => {
  const { user } = await auth.createUserWithEmailAndPassword(email, password);
  await user.updateProfile({ displayName });
  // Guarda el perfil en Firestore para que otros miembros puedan resolverlo
  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    displayName,
    photoURL: null,
    createdAt: new Date().toISOString(),
  }, { merge: true });
  return user;
};

export const doSignInWithEmail = ({ email, password }) =>
  auth.signInWithEmailAndPassword(email, password);

export const doSendPasswordReset = (email) =>
  auth.sendPasswordResetEmail(email);

export const hasPasswordProvider = (user) =>
  user?.providerData?.some((p) => p.providerId === "password") ?? false;

export const doUploadProfilePhoto = async (file) => {
  const user = requireAuthUser();
  const ref = storage.ref(`users/${user.uid}/profile`);
  await ref.put(file);
  return ref.getDownloadURL();
};

export const doUpdateProfile = async ({ firstName, lastName, photoURL }) => {
  const user = requireAuthUser();
  const displayName = `${firstName || ""} ${lastName || ""}`.trim() || user.email;

  await user.updateProfile({
    displayName,
    photoURL: photoURL ?? user.photoURL ?? null,
  });

  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email,
      firstName: firstName || "",
      lastName: lastName || "",
      displayName,
      photoURL: photoURL ?? user.photoURL ?? null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { displayName, photoURL: photoURL ?? user.photoURL ?? null };
};

export const doUpdatePassword = async (newPassword) => {
  const user = requireAuthUser();
  if (!hasPasswordProvider(user)) {
    throw new Error("Tu cuenta usa Google. Usa 'Olvidé mi contraseña' o vincula email/contraseña.");
  }
  await user.updatePassword(newPassword);
};
