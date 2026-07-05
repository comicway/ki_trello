import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isBrowser = typeof window !== "undefined";
const isConfigValid = Boolean(config.apiKey && config.projectId);

if (isBrowser && isConfigValid && !firebase.apps.length) {
  firebase.initializeApp(config);
}

const auth = isBrowser && isConfigValid ? firebase.auth() : null;
const db = isBrowser && isConfigValid ? firebase.firestore() : null;
const storage = isBrowser && isConfigValid ? firebase.storage() : null;

export { auth, db, storage, firebase };
