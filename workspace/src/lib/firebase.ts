
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, type Analytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let analytics: Analytics | undefined = undefined;
let db: Firestore | undefined = undefined;
let storage: FirebaseStorage | undefined = undefined;

if (typeof window !== 'undefined') {
  // Ensures this code runs only on the client-side
  if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
      console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing. Check your .env file.");
    }
    console.log("Initializing Firebase app on client with projectId:", firebaseConfig.projectId);
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized on client:", app.name);
  } else {
    app = getApps()[0]!;
    console.log("Using existing Firebase app on client:", app.name);
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  isAnalyticsSupported().then(supported => {
    if (supported && firebaseConfig.measurementId) {
      try {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized on client.");
      } catch (e) {
        console.error("Failed to initialize Firebase Analytics on client", e);
      }
    } else {
      console.log("Firebase Analytics not supported or no measurementId provided for client.");
    }
  });

} else {
  // Server-side initialization (primarily for Genkit using client SDK or admin SDK in future)
  if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
      // This might be less critical if server-side uses Admin SDK, but good to note
      console.warn("Firebase Warning: API key is missing for server-side context. Ensure Genkit or other server processes have necessary credentials if using client SDK.");
    }
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized on server (or build time):", app.name);

  } else {
    app = getApps()[0]!;
    console.log("Using existing Firebase app on server (or build time):", app.name);
  }
  // These are client SDK instances, even on server.
  // For true admin access, Firebase Admin SDK would be initialized separately.
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, analytics, db, storage };
