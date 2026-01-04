import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Get shop for logged-in partner by email
 */
export async function getPartnerShop(email: string) {
  if (!email) return null;

  const q = query(collection(db, "shops"), where("ownerEmail", "==", email));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const d = snapshot.docs[0];

  return {
    id: d.id,
    ...d.data(),
  };
}

/**
 * Update shop details (partner dashboard edit)
 * Supports text fields + optional image/logo
 */
export async function updatePartnerShop(
  shopId: string,
  data: {
    name: string;
    description: string;
    address: string;
    phone: string;
    image?: string; // optional shop image / logo
  },
) {
  if (!shopId) {
    throw new Error("shopId is required");
  }

  const ref = doc(db, "shops", shopId);

  await updateDoc(ref, {
    name: data.name,
    description: data.description,
    address: data.address,
    phone: data.phone,
    ...(data.image ? { image: data.image } : {}),
    updatedAt: new Date(),
  });
}
