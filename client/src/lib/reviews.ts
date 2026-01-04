import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Add review (Admin approval required)
 */
export async function addReview(
  shopId: string,
  name: string,
  rating: number,
  comment: string,
) {
  // Safety check
  if (!shopId || !name || !rating || !comment) {
    throw new Error("Missing required review fields");
  }

  await addDoc(collection(db, "reviews"), {
    shopId,
    name,
    rating,
    comment,
    approved: false, // ❗ Admin approve karega
    createdAt: serverTimestamp(),
  });
}

/**
 * Get ONLY approved reviews (for shop page)
 */
export async function getReviews(shopId: string) {
  const q = query(
    collection(db, "reviews"),
    where("shopId", "==", shopId),
    where("approved", "==", true),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
