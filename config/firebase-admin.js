const admin = require('firebase-admin');
const serviceAccount = require('./healthpal_firebase_services.json');

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;