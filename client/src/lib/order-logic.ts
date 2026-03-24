const WHATSAPP_NUMBER = "917696888881";
const API_BASE = "/api";

export interface LeadData {
  source?: string;
  action?: string;
  itemId?: string;
  itemName?: string;
  category?: string;
  searchTerm?: string;
  productId?: string;
  vendorId?: string;
  districtId?: string;
  metadata?: Record<string, any>;
}

export async function trackLead(data: LeadData): Promise<void> {
  try {
    await fetch(`${API_BASE}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: data.source || "WHATSAPP_INQUIRY",
        action: data.action || "click",
        itemId: data.itemId,
        itemName: data.itemName,
        category: data.category,
        searchTerm: data.searchTerm,
        productId: data.productId,
        vendorId: data.vendorId,
        districtId: data.districtId,
        metadata: data.metadata || {},
      }),
    });
  } catch (error) {
    console.error("Lead tracking failed:", error);
  }
}

export function buildWhatsAppMessage(
  productName: string,
  productPrice?: string,
  storeName?: string
): string {
  let message = `Hello Shahdol Bazaar! I'm interested in:\n\n`;
  message += `📦 *${productName}*`;
  if (productPrice) message += ` - ${productPrice}`;
  message += `\n`;
  if (storeName) message += `🏪 Store: ${storeName}\n`;
  message += `\nPlease share more details.`;
  return encodeURIComponent(message);
}

export function openWhatsApp(
  productName: string,
  productPrice?: string,
  storeName?: string,
  productId?: string,
  vendorId?: string,
  districtId?: string
): void {
  const message = buildWhatsAppMessage(productName, productPrice, storeName);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  
  trackLead({
    source: "WHATSAPP_INQUIRY",
    action: "click",
    itemId: productId,
    itemName: productName,
    productId,
    vendorId,
    districtId,
  });
  
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openWhatsAppDirect(message: string): void {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, "_blank", "noopener,noreferrer");
}
