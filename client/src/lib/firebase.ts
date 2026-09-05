// Firebase configuration - Kept for image upload functionality only
// Auth is now handled via JWT on the backend

import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shahdolbazaar.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shahdolbazaar",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "shahdolbazaar.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// 1. App Start (for storage only)
export const app = initializeApp(firebaseConfig);

// 2. Storage & Firestore exports
export const storage = getStorage(app);
export const db = getFirestore(app);

// 3. Upload Function (for images)
export async function uploadImageToFirebase(file: File) {
  try {
    const fileName = `shops/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Firebase Upload Failed:", error);
    throw error;
  }
}

// Note: Firebase Auth has been removed. JWT-based auth is now used.
// To use Firebase Auth in the future, uncomment these lines:
// export const auth = getAuth(app);
// export { getAuth } from "firebase/auth";
