import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

let firebaseApp: App | null = null;

export function initFirebase() {
  const firebaseEnabled = process.env.FIREBASE_ENABLED === 'true';
  if (!firebaseEnabled) {
    console.log('[Firebase] Integration is disabled via FIREBASE_ENABLED');
    return null;
  }

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase/service-account.json';
    const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

    if (!fs.existsSync(absolutePath)) {
      console.warn(`[Firebase] Service account file not found at ${absolutePath}. Firebase SDK will not be initialized.`);
      return null;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));

    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
      console.log('[Firebase] Reusing existing initialized Firebase App:', firebaseApp.name);
      return firebaseApp;
    }

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });

    console.log('[Firebase] Admin SDK initialized successfully for project:', firebaseApp.options.projectId);
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

export function getFirebaseApp() {
  return firebaseApp;
}
