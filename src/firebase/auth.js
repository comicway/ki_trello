import firebase from "firebase/app";
import { auth } from "./firebase";

const googleProvider = new firebase.auth.GoogleAuthProvider();

export const doSignInWithGoogle = () => auth.signInWithPopup(googleProvider);

export const doSignOut = () => auth.signOut();
