import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   Get ALL reviews
========================= */
export async function getAllReviews() {
  const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* =========================
   Get reviews by status
========================= */
export async function getReviewsByStatus(approved: boolean) {
  const q = query(
    collection(db, "reviews"),
    where("approved", "==", approved),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* =========================
   Approve review
========================= */
export async function approveReview(reviewId: string) {
  const ref = doc(db, "reviews", reviewId);
  await updateDoc(ref, { approved: true });
}

/* =========================
   Delete review
========================= */
export async function deleteReview(reviewId: string) {
  await deleteDoc(doc(db, "reviews", reviewId));
}
