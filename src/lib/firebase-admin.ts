import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }

    try {
        // Check if we have service account credentials in environment variables
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
        
        if (!serviceAccount) {
            throw new Error(
                'FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT is not set in environment variables. ' +
                'Please add your Firebase service account JSON to .env file. ' +
                'Get it from: Firebase Console → Project Settings → Service Accounts → Generate new private key'
            );
        }

        // Parse the service account JSON
        const serviceAccountKey = JSON.parse(serviceAccount);
        
        // Initialize with explicit credentials
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: serviceAccountKey.project_id,
                clientEmail: serviceAccountKey.client_email,
                privateKey: serviceAccountKey.private_key.replace(/\\n/g, '\n'),
            }),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccountKey.project_id,
        });
        
        console.log('Firebase Admin initialized successfully');
        return app;
    } catch (error: any) {
        console.error('Error initializing Firebase Admin:', error);
        throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
    }
}

// Initialize the app
initializeFirebaseAdmin();

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
