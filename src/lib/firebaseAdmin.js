import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const trimEnv = (value) => value?.trim().replace(/^["']|["']$/g, "") || "";

const parsePrivateKey = (raw) => {
  if (!raw) return undefined;
  return trimEnv(raw).replace(/\\n/g, "\n");
};

const parseServiceAccount = () => {
  const json = trimEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!json) return null;

  try {
    return JSON.parse(json);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON");
  }
};

const buildCredential = () => {
  const serviceAccount = parseServiceAccount();
  if (serviceAccount) return cert(serviceAccount);

  const projectId =
    trimEnv(process.env.FIREBASE_PROJECT_ID) ||
    trimEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  const clientEmail = trimEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY"
    );
  }

  return cert({ projectId, clientEmail, privateKey });
};

export const getFirebaseAdminApp = () => {
  const existingApps = getApps();
  if (existingApps.length > 0) return existingApps[0];

  return initializeApp({ credential: buildCredential() });
};

export const getAdminAuth = () => getAuth(getFirebaseAdminApp());

export const getAdminFirestore = () => getFirestore(getFirebaseAdminApp());

export const verifyFirebaseIdToken = async (token) => {
  return getAdminAuth().verifyIdToken(token);
};
