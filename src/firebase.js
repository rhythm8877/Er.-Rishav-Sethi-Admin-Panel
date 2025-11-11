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

if (missingVars.length > 0) {
  console.error('❌ Missing Firebase environment variables:', missingVars.join(', '));
  console.error('Please set these variables in your .env file or Netlify environment variables.');
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId
};

// Validate config before initializing
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is incomplete. Cannot initialize Firebase.');
  throw new Error('Firebase configuration is missing required fields. Please check your environment variables.');
}

let app;
try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const callDeleteUser = async (payload) => {
  const fn = httpsCallable(functions, 'adminDeleteUser');
  const res = await fn(payload);
  return res.data;
};
