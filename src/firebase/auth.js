import firebase from "firebase/app";
import { auth, db } from "./firebase";

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
