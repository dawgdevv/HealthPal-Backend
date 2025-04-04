const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables
try {
  // Try to use the JSON file in development
  let firebaseConfig;
  
  if (process.env.NODE_ENV === 'production') {
    // Use environment variables in production
    firebaseConfig = {
      credential: admin.credential.cert({
        "type": process.env.FIREBASE_TYPE,
        "project_id": process.env.FIREBASE_PROJECT_ID,
        "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
        "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        "client_email": process.env.FIREBASE_CLIENT_EMAIL,
        "client_id": process.env.FIREBASE_CLIENT_ID,
        "auth_uri": process.env.FIREBASE_AUTH_URI,
        "token_uri": process.env.FIREBASE_TOKEN_URI,
        "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL,
        "universe_domain": process.env.FIREBASE_UNIVERSE_DOMAIN
      })
    };
  } else {
    // In development, use the JSON file
    const serviceAccount = require('./healthpal_firebase_services.json');
    firebaseConfig = {
      credential: admin.credential.cert(serviceAccount)
    };
  }
  
  if (!admin.apps.length) {
    admin.initializeApp(firebaseConfig);
  }
  
  console.log('Firebase Admin SDK initialized successfully');
  
} catch (error) {
  console.error('Firebase Admin SDK initialization error:', error);
}

module.exports = admin;