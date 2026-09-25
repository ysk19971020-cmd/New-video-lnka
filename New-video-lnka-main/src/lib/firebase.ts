// ===== Firebase Client SDK =====
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// All values MUST be set in .env.local — no hardcoded fallbacks.
// Hardcoded credentials are a security risk: they get committed to git
// and anyone can read/write your database.
const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env variable: ${key}. See .env.example.`);
  return v;
};

const firebaseConfig = {
  apiKey:            required('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain:        required('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,   // optional
  projectId:         required('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // optional
  messagingSenderId: required('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             required('NEXT_PUBLIC_FIREBASE_APP_ID'),
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // optional
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
