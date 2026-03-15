const admin = require('firebase-admin');

// IMPORTANT: You need to download your serviceAccountKey.json 
// from your Firebase Project Settings (Service Accounts -> Generate new private key)
// and place it in the SAME folder as this config file, or at the root of the backend.
// We are resolving it dynamically here assuming it will be in the backend root.

const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error.message);
  }
} else {
  console.log("=========================================================");
  console.log("⚠️  WARNING: Firebase Admin Initialization Skipped");
  console.log("Could not find serviceAccountKey.json at the backend root.");
  console.log("Authentication routes will fail until this is added.");
  console.log("=========================================================");
}

module.exports = admin;
