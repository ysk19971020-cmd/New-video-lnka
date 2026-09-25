// ===== Firebase Admin SDK (Server-side only) =====
// Used in API routes to verify Firebase ID tokens securely

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env variable is not set. See .env.example.');
  }

  try {
    const serviceAccount = JSON.parse(raw);
    return initializeApp({ credential: cert(serviceAccount) });
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }
}

/** Verify any Firebase user token. Returns uid + email, or null if invalid. */
export async function verifyAuthToken(
  authHeader: string | null
): Promise<{ uid: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? '' };
  } catch {
    return null;
  }
}

/** Verify Firebase token AND confirm the email is in ADMIN_EMAILS. */
export async function verifyAdminToken(
  authHeader: string | null
): Promise<{ uid: string; email: string } | null> {
  const user = await verifyAuthToken(authHeader);
  if (!user) return null;
  if (!ADMIN_EMAILS.includes(user.email)) return null;
  return user;
}
