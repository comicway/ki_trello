import admin from "firebase-admin";

const getPrivateKey = () =>
  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const getFirebaseAdmin = () => {
  if (admin.apps.length) return admin;

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
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
