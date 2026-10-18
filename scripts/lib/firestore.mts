/**
 * Klien Firestore untuk skrip operasional.
 *
 * Memakai SDK web (firebase/app + firebase/firestore) dengan kredensial
 * dari `.env`. Aturan keamanan proyek mengizinkan tulis dari klien, jadi
 * skrip ini bisa mengisi koleksi tanpa service account admin.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { readEnv } from './env.mts';

let cached: Firestore | null = null;

/** Koneksi Firestore (dibuat sekali lalu dipakai ulang). */
export function firestore(): Firestore {
  if (cached) return cached;
  const env = readEnv();
  const app: FirebaseApp = initializeApp({
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID,
  });
  cached = getFirestore(app);
  return cached;
}
