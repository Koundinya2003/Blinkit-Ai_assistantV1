import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase exactly once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export initialized instances
export { app };

export const db = getFirestore(app);

// Keep getDb() for backward compatibility with existing service files
export function getDb() {
  return db;
}

export const auth = getAuth(app);

/**
 * Quick health check: attempts to read a single document from Firestore.
 * Returns true if Firestore is reachable, false otherwise.
 * Uses a minimal timeout to avoid blocking the UI.
 */
let firestoreHealthy: boolean | null = null;

export async function checkFirestoreHealth(): Promise<boolean> {
  if (firestoreHealthy !== null) return firestoreHealthy;

  try {
    const { collection, getDocs, limit, query } = await import("firebase/firestore");
    const q = query(collection(db, "products"), limit(1));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore health check timed out")), 2000)
    );
    await Promise.race([getDocs(q), timeout]);
    firestoreHealthy = true;
    return true;
  } catch {
    firestoreHealthy = false;
    return false;
  }
}

export function isFirestoreHealthy(): boolean | null {
  return firestoreHealthy;
}

export function resetFirestoreHealth(): void {
  firestoreHealthy = null;
}