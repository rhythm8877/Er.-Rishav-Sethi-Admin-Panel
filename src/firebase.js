import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Validate environment variables
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check for missing environment variables
const envVarMap = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID'
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value || value === 'undefined')
  .map(([key]) => envVarMap[key]);

// Log warnings but don't crash the app
if (missingVars.length > 0) {
  console.warn('⚠️ Missing Firebase environment variables:', missingVars.join(', '));
  console.warn('Please set these variables in your .env file or Netlify environment variables.');
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId
};

// Initialize Firebase only if config is valid, otherwise set to null
let app = null;
let db = null;
let storage = null;
let functions = null;

const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    // Don't throw - let the app continue to render
  }
} else {
  console.error('❌ Firebase configuration is incomplete. Firebase features will not work.');
  console.error('Please set the required environment variables in your .env file or Netlify dashboard.');
}

// Export Firebase services (may be null if not configured)
export { db, functions, storage };

// Export a function to check if Firebase is ready
export const isFirebaseReady = () => isFirebaseConfigured && app !== null;

export const callDeleteUser = async (payload) => {
  if (!functions) {
    throw new Error('Firebase is not configured. Please set environment variables.');
  }
  const fn = httpsCallable(functions, 'adminDeleteUser');
  const res = await fn(payload);
  return res.data;
};
