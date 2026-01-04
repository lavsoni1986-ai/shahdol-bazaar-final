import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore } from "firebase/firestore"; // ✅ Database wapas aa gaya
import { getAuth } from "firebase/auth"; // ✅ Auth bhi wapas

// Aapki Config
const firebaseConfig = {
  apiKey: "AIzaSyDsw6Lprd7DjnF6KL3eY4n2FjfCwsPuo-U",
  authDomain: "shahdolbazaar-20221.firebaseapp.com",
  projectId: "shahdolbazaar-20221",
  storageBucket: "shahdolbazaar-20221.firebasestorage.app",
  messagingSenderId: "1041061893156",
  appId: "1:1041061893156:web:aace73b331ad5fbb5234b1",
};

// 1. App Start
export const app = initializeApp(firebaseConfig);

// 2. Exports (Jo baaki files maang rahi hain)
export const db = getFirestore(app); // ✅ Ye missing tha
export const auth = getAuth(app);
export const storage = getStorage(app);

// 3. Upload Function (Jo Dashboard maang raha hai)
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
