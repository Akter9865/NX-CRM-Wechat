import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { firebaseConfig } from "./config";

let app: FirebaseApp;
let analytics: Analytics | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;

  try {
    const supported = await isSupported();
    if (supported) {
      const app = getFirebaseApp();
      if (!analytics) {
        analytics = getAnalytics(app);
      }
      return analytics;
    }
  } catch (err) {
    console.warn("[Firebase Analytics] init notice:", err);
  }
  return null;
}
