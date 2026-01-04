import {
  ShoppingBag,
  Pill,
  Smartphone,
  Utensils,
  GraduationCap,
  Briefcase,
  Home as HomeIcon,
} from "lucide-react";

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

/* =======================
   TYPES
======================= */

export interface Shop {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  image: string;
  rating: number;
  reviews: number;
  featured?: boolean;

  // 🔑 Partner login ke liye
  ownerEmail?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: any;
  color: string;
  slug: string;
}

/* =======================
   CATEGORIES
======================= */

export const CATEGORIES: Category[] = [
  {
    id: "1",
    name: "Grocery",
    icon: ShoppingBag,
    color: "bg-green-100 text-green-600",
    slug: "grocery",
  },
  {
    id: "2",
    name: "Medical",
    icon: Pill,
    color: "bg-blue-100 text-blue-600",
    slug: "medical",
  },
  {
    id: "3",
    name: "Mobile & Electronics",
    icon: Smartphone,
    color: "bg-purple-100 text-purple-600",
    slug: "electronics",
  },
  {
    id: "4",
    name: "Restaurants",
    icon: Utensils,
    color: "bg-orange-100 text-orange-600",
    slug: "restaurants",
  },
  {
    id: "5",
    name: "Coaching & Education",
    icon: GraduationCap,
    color: "bg-yellow-100 text-yellow-600",
    slug: "education",
  },
  {
    id: "6",
    name: "Services",
    icon: Briefcase,
    color: "bg-gray-100 text-gray-600",
    slug: "services",
  },
  {
    id: "7",
    name: "Real Estate",
    icon: HomeIcon,
    color: "bg-indigo-100 text-indigo-600",
    slug: "real-estate",
  },
];

/* =======================
   STATIC SHOPS (Demo / MVP)
   🔴 Later Firestore se replace hoga
======================= */

export const SHOPS: Shop[] = [
  {
    id: "1",
    name: "Gupta General Store",
    category: "grocery",
    description:
      "Best quality pulses, rice, and daily needs at wholesale prices.",
    address: "Main Market, Shahdol",
    phone: "919876543210",
    image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a",
    rating: 4.5,
    reviews: 120,
    featured: true,
    ownerEmail: "admin@shahdolbazaar.com",
  },
  {
    id: "2",
    name: "City Medical Hall",
    category: "medical",
    description: "24/7 Pharmacy with all medicines available.",
    address: "District Hospital Road, Shahdol",
    phone: "919876543211",
    image: "https://images.unsplash.com/photo-1585435557343-3b092031a831",
    rating: 4.8,
    reviews: 85,
    featured: true,
    ownerEmail: "medical@shahdolbazaar.com",
  },
];

/* =======================
   PARTNER LOGIN HELPERS
======================= */

/**
 * Get shop by owner email (Partner Login)
 * Firestore collection: shops
 */
export async function getShopByOwnerEmail(email: string) {
  if (!email) return null;

  const q = query(collection(db, "shops"), where("ownerEmail", "==", email));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as Shop;
}
