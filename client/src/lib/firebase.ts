// Firebase configuration - Kept for image upload functionality only
// Auth is now handled via JWT on the backend

import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Aapki Config
const firebaseConfig = {
  apiKey: "AIzaSyDsw6Lprd7DjnF6KL3eY4n2FjfCwsPuo-U",
  authDomain: "shahdolbazaar-20221.firebaseapp.com",
  projectId: "shahdolbazaar-20221",
  storageBucket: "shahdolbazaar-20221.firebasestorage.app",
  messagingSenderId: "1041061893156",
  appId: "1:1041061893156:web:aace73b331ad5fbb5234b1",
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
