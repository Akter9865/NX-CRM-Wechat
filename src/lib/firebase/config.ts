// Firebase Client SDK Configuration for NX CRM
// Project: nxcrm-cb276
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAR1hm8EA_c0sb_sndaA6iRUxxnaemgC_I",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "nxcrm-cb276.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nxcrm-cb276",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "nxcrm-cb276.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "952811010414",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:952811010414:web:f4a51d495835e07d1a297f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-BPCNRD7STJ",
};
