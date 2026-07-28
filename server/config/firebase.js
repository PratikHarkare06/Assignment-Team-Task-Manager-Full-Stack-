// Firebase Admin SDK - verifies Firebase ID tokens on the backend
// Using application default credentials approach — no service account file needed
// when FIREBASE_PROJECT_ID is set, tokens are verified against that project

let admin;

try {
  admin = require('firebase-admin');

  if (!admin.apps.length) {
    // Initialize with just the project ID — sufficient for ID token verification
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'momentum-a2ec4',
    });
  }
} catch (err) {
  // firebase-admin not installed — auth controller falls back to manual decode
  console.warn('⚠️  firebase-admin not available, using dev fallback for token verification');
  admin = null;
}

module.exports = admin;
