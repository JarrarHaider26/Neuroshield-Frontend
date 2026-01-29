
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Added for completeness
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let analytics: Analytics | undefined = undefined;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    console.log("Initializing Firebase app on client...");
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized:", app.name);
  } else {
    app = getApps()[0]!;
    console.log("Using existing Firebase app:", app.name);
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  if (firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized.");
    } catch (e) {
      console.error("Failed to initialize Firebase Analytics", e);
    }
  }
} else {
  // For server-side initialization (e.g. Genkit flows if they were to init Firebase admin)
  // Note: Genkit flows currently use the client SDK for Firestore for simplicity with saving reports.
  // A separate Firebase Admin SDK initialization would be needed for true server-side admin operations.
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
  auth = getAuth(app); // Client auth, not admin auth
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, analytics, db, storage };
