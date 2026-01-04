import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* -------------------------------------------------
   Get ALL approved shops (Home page / Featured)
-------------------------------------------------- */
export async function getApprovedShops() {
  const q = query(
    collection(db, "shops"),
    where("approved", "==", true),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* -------------------------------------------------
   Get approved shops by category
-------------------------------------------------- */
export async function getApprovedShopsByCategory(category: string) {
  const q = query(
    collection(db, "shops"),
    where("approved", "==", true),
    where("category", "==", category),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* -------------------------------------------------
   Get SINGLE shop by ID (Public shop page)
   ❗ Only approved shops are visible
-------------------------------------------------- */
export async function getShopById(id: string) {
  if (!id) return null;

  const ref = doc(db, "shops", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();

  // 🔐 Public page safety check
  if (!data.approved) {
    return null;
  }

  return {
    id: snap.id,
    ...data,
  };
}
