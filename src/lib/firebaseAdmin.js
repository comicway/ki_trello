import admin from "firebase-admin";

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

export const getFirebaseAdmin = () => {
  if (admin.apps.length) return admin;

  const serviceAccount = parseServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  }

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

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  return admin;
};

export const verifyFirebaseIdToken = async (token) => {
  const auth = getFirebaseAdmin().auth();
  return auth.verifyIdToken(token);
};
