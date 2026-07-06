import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const trimEnv = (value) => value?.trim().replace(/^["']|["']$/g, "") || "";

let remoteJwks;

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

export const getAdminFirestore = () => getFirestore(getFirebaseAdminApp());

const getRemoteJwks = async () => {
  if (!remoteJwks) {
    const { createRemoteJWKSet } = await import("jose");
    remoteJwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  }
  return remoteJwks;
};

export const verifyFirebaseIdToken = async (token) => {
  const projectId =
    trimEnv(process.env.FIREBASE_PROJECT_ID) ||
    trimEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

  if (!projectId) {
    throw new Error("Firebase project ID is not configured");
  }

  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, await getRemoteJwks(), {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.email) {
    throw new Error("Token has no email claim");
  }

  return payload;
};
