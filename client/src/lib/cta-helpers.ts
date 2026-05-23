/**
 * Dynamic CTA Button Logic Based on Shop Category
 * Maps shop categories to appropriate button text, icon, and action type
 */

export type CTAType = "buy" | "book_appointment" | "book_service" | "order_food";

export interface CTAConfig {
  primary: {
    text: string;
    icon: string;
    action: CTAType;
    color: string; // Tailwind color class
  };
  secondary?: {
    text: string;
    icon: string;
    action: string;
    color: string;
  };
}

const CATEGORY_PATTERNS = {
  health: /health|wellness|hospital|clinic|pharmacy|dental|fitness/i,
  food: /food|beverage|restaurant|cafe|bakery|quick bite|vada|pav/i,
  services: /service|plumbing|electrical|salon|spa|cleaning|repair/i,
  fashion: /fashion|apparel|clothing|footwear|accessories|dress/i,
  electronics: /electronic|phone|laptop|tablet|gadget/i,
};

/**
 * Determine the CTA configuration based on vendor category
 * @param vendorCategory - The category name (e.g., "Hospitals", "Fast Food", "Salon")
 * @returns CTA configuration with button text, icon, and action type
 */
export function getCTAConfig(vendorCategory: string): CTAConfig {
  if (CATEGORY_PATTERNS.health.test(vendorCategory)) {
    return {
      primary: {
        text: "📅 Book Appointment",
        icon: "Calendar",
        action: "book_appointment",
        color: "bg-blue-600 hover:bg-blue-700",
      },
      secondary: {
        text: "📞 Emergency Call",
        icon: "Phone",
        action: "emergency_call",
        color: "bg-red-600 hover:bg-red-700",
      },
    };
  }

  if (CATEGORY_PATTERNS.food.test(vendorCategory)) {
    return {
      primary: {
        text: "🛒 Order Now",
        icon: "ShoppingCart",
        action: "order_food",
        color: "bg-orange-600 hover:bg-orange-700",
      },
    };
  }

  if (CATEGORY_PATTERNS.services.test(vendorCategory)) {
    return {
      primary: {
        text: "🗓️ Book Service",
        icon: "Calendar",
        action: "book_service",
        color: "bg-green-600 hover:bg-green-700",
      },
    };
  }

  // Default for Fashion, Electronics, and other categories
  return {
    primary: {
      text: "🛍️ Buy Now",
      icon: "ShoppingBag",
      action: "buy",
      color: "bg-orange-600 hover:bg-orange-700",
    },
  };
}

/**
 * Get WhatsApp message context based on vendor category
 * @param vendorName - The vendor name
 * @param vendorCategory - The vendor category
 * @param customContext - Optional custom context
 * @returns WhatsApp message prefix
 */
export function getWhatsAppContext(
  vendorName: string,
  vendorCategory: string,
  customContext?: string
): string {
  if (CATEGORY_PATTERNS.health.test(vendorCategory)) {
    return `Hello ${vendorName}, I want to book an appointment via ShahdolBazaar. ${customContext || ""}`;
  }

  if (CATEGORY_PATTERNS.food.test(vendorCategory)) {
    return `Hi ${vendorName}, I'd like to order via ShahdolBazaar. ${customContext || ""}`;
  }

  if (CATEGORY_PATTERNS.services.test(vendorCategory)) {
    return `Hello ${vendorName}, I want to book a service via ShahdolBazaar. ${customContext || ""}`;
  }

  return `Hello ${vendorName}, I'm interested in your products on ShahdolBazaar. ${customContext || ""}`;
}

/**
 * Determine if a category requires booking functionality
 * @param vendorCategory - The vendor category
 * @returns true if the category supports bookings
 */
export function supportsBookings(vendorCategory: string): boolean {
  return CATEGORY_PATTERNS.health.test(vendorCategory) || CATEGORY_PATTERNS.services.test(vendorCategory);
}

/**
 * Get color class for category badge
 * @param vendorCategory - The vendor category
 * @returns Tailwind color classes
 */
export function getCategoryColor(vendorCategory: string): { bg: string; text: string } {
  if (CATEGORY_PATTERNS.health.test(vendorCategory)) {
    return { bg: "bg-blue-100", text: "text-blue-700" };
  }

  if (CATEGORY_PATTERNS.food.test(vendorCategory)) {
    return { bg: "bg-orange-100", text: "text-orange-700" };
  }

  if (CATEGORY_PATTERNS.services.test(vendorCategory)) {
    return { bg: "bg-green-100", text: "text-green-700" };
  }

  if (CATEGORY_PATTERNS.fashion.test(vendorCategory)) {
    return { bg: "bg-pink-100", text: "text-pink-700" };
  }

  if (CATEGORY_PATTERNS.electronics.test(vendorCategory)) {
    return { bg: "bg-purple-100", text: "text-purple-700" };
  }

  return { bg: "bg-slate-100", text: "text-slate-700" };
}
