// @ts-nocheck
// 📁 server/services/ai.service.ts
// AI Content Orchestrator for BharatOS - Product descriptions & SEO metadata
// Now with Groq SDK integration and Sovereign Fallback

import { callGroqChat, DEFAULT_MODEL } from "../middleware/groq";
import { findProductById, updateProduct, findVendorById, updateVendor } from "../repositories/common.repo";
import { findDistrictById } from "../repositories/district.repo";

interface ProductContext {
  name: string;
  category: string;
  price?: number;
  features?: string[];
}

interface VendorContext {
  name: string;
  category: string;
  location?: string;
  description?: string;
}

// Local dialect nuances for different regions (SOVEREIGN FALLBACK)
const DIALECT_PATTERNS: Record<string, { honorific: string; default_greeting: string }> = {
  bhopal: { honorific: "जी", default_greeting: "नमस्ते जी" },
  indore: { honorific: "भाई", default_greeting: "नमस्ते" },
  jabalpur: { honorific: "महाराज", default_greeting: "नमस्ते महाराज" },
  shahdol: { honorific: "भाई साहब", default_greeting: "नमस्ते भाई साहब" },
  umaria: { honorific: "भाई", default_greeting: "नमस्ते" },
  katni: { honorific: "भाई", default_greeting: "नमस्ते" },
};

function getDialect(districtSlug: string) {
  return DIALECT_PATTERNS[districtSlug] || DIALECT_PATTERNS.shahdol;
}

// SOVEREIGN FALLBACK: Local Hindi generation when AI fails
function generateHindiDescription(context: ProductContext, dialect: { honorific: string; default_greeting: string }): string {
  const { name, category, price, features } = context;
  const featureList = features?.slice(0, 3).map(f => `• ${f}`).join("\n") || "";
  const priceText = price ? `कीमत: ₹${price}` : "";
  
  return `
${dialect.default_greeting}! 🙏

${name} - एक उत्कृष्ट ${category} उत्पाद है। ${priceText}

विशेषताएं:
${featureList}

📦 Fast Delivery Available
✅ Quality Guaranteed
🛡️ Secure Payment Options

${dialect.honorific}, आपके लिए सबसे अच्छा विकल्प!
  `.trim();
}

function generateEnglishDescription(context: ProductContext): string {
  const { name, category, price, features } = context;
  return `
Discover ${name} - Premium ${category} Solution

${price ? `Price: ₹${price}` : ""}

${features?.length ? `Key Features:\n${features.map(f => `• ${f}`).join("\n")}` : ""}

✅ Quality Guaranteed
🚚 Fast Delivery
🔒 Secure Payments

Order now and experience the best!
  `.trim();
}

function generateSEOData(context: ProductContext | VendorContext, districtSlug: string) {
  const isProduct = 'price' in context;
  const name = context.name;
  const category = context.category;
  const location = 'location' in context ? context.location : '';
  
  return {
    metaTitle: `${name} in ${location || districtSlug} | Best ${category} | BharatOS`,
    metaDescription: `Buy ${name} - Best quality ${category} in ${location || districtSlug}. Free delivery, secure payment.`,
    keywords: [name, category, districtSlug, "buy", "online", "BharatOS"].join(", "),
    ogImage: null
  };
}

// AI-POWERED content generation with Sovereign Fallback
async function generateGroqContent(context: ProductContext, districtSlug: string): Promise<{ hindi: string; english: string } | null> {
  const dialect = getDialect(districtSlug);
  
  const prompt = `Generate a product description for "${context.name}" in ${districtSlug}.
Category: ${context.category}
${context.price ? `Price: ₹${context.price}` : ''}
${context.features?.length ? `Features: ${context.features.join(', ')}` : ''}

Respond in JSON format:
{
  "hindi": "Hindi description with local dialect (${dialect.default_greeting} style)",
  "english": "English product description"
}`;

  const result = await callGroqChat([
    { role: "system", content: "You are a helpful AI assistant for BharatOS local marketplace." },
    { role: "user", content: prompt }
  ], DEFAULT_MODEL, { temperature: 0.3, maxTokens: 512 });

  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    return {
      hindi: parsed.hindi || generateHindiDescription(context, dialect),
      english: parsed.english || generateEnglishDescription(context)
    };
  } catch {
    return null;
  }
}

export const aiService = {
  async generateProductContent(
    productId: number,
    districtSlug: string = "shahdol"
  ): Promise<{ hindi: string; english: string; seo: any }> {
    const product = await findProductById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    const dialect = getDialect(districtSlug);
    const context: ProductContext = {
      name: (product as any).name || (product as any).title || "Product",
      category: product.categoryName || "Product",
      price: product.price ? Number(product.price) : undefined,
      features: product.description?.split(".").filter(Boolean).slice(0, 3)
    };

    // TRY AI FIRST, then fallback to local generation
    const aiResult = await generateGroqContent(context, districtSlug);
    
    const hindi = aiResult?.hindi || generateHindiDescription(context, dialect);
    const english = aiResult?.english || generateEnglishDescription(context);
    const seo = generateSEOData(context, districtSlug);

    // Update product with AI-generated content
    await prisma.product.update({
      where: { id: productId },
      data: {
        aiDescription: hindi,
        aiAdCopy: english
      }
    }).catch(() => {}); // Silently fail if update fails

    return { hindi, english, seo };
  },

  async generateVendorContent(
    vendorId: number,
    districtSlug: string = "shahdol"
  ): Promise<{ description: string; seo: any }> {
    const vendor = await findVendorById(vendorId);

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    const dialect = getDialect(districtSlug);
    const context: VendorContext = {
      name: vendor.name,
      category: (vendor as any).category || vendor.businessType || "Business",
      location: vendor.address || undefined,
      description: vendor.description || undefined
    };

    const description = `
${dialect.default_greeting} ${dialect.honorific},

स्वागत है! ${context.name} आपके ${context.location || 'शहर'} में।

हम ${context.category} के विशेषज्ञ हैं। 
${context.description ? `परिचय: ${context.description}` : ""}

📞 ${vendor.phone || vendor.mobile || 'Contact for details'}
📍 ${vendor.address || 'Address not available'}

जीरो से पेमेंट ऑप्शन उपलब्ध!
    `.trim();

    const seo = generateSEOData(context, districtSlug);

    // Update vendor with AI-generated description
    await updateVendor(vendorId, {
      aiDescription: description
    }).catch(() => {});

    return { description, seo };
  },

  // ASYNC AI UPDATE: Background refresh without hanging main request
  async refreshDSSLScore(vendorId: number, districtId: number): Promise<void> {
    try {
      const vendor = await findVendorById(vendorId, { vendorMLProfile: true });
      
      if (!vendor) return;

      // Calculate sync score first
      const dssl = (vendor.dsslScore || 0) / 100;
      const mlScore = vendor.vendorMLProfile?.reliabilityScore || 0.5;
      const contextScore = 0.8;
      const score = (0.5 * dssl) + (0.3 * mlScore) + (0.2 * contextScore);
      
      // Optional: Call Groq for enhanced scoring (non-blocking)
      const prompt = `Analyze this vendor for DSSL score calculation:
Name: ${vendor.name}
Type: ${vendor.businessType}
Trust Indicators: Rating ${vendor.rating}, Reviews ${vendor.totalReviews}, DSSL ${vendor.dsslScore}

Respond with a score improvement suggestion in JSON:
{ "suggestion": "brief suggestion", "boost": number between 0-10}`;

      const groqResult = await callGroqChat([
        { role: "system", content: "You are a business trust analyst." },
        { role: "user", content: prompt }
      ], DEFAULT_MODEL, { temperature: 0.2, maxTokens: 128 });

      let boost = 0;
      if (groqResult) {
        try {
          const parsed = JSON.parse(groqResult);
          boost = parsed.boost || 0;
        } catch {}
      }

    // Update with improved score
      const finalScore = Math.min(100, Math.round((score * 100) + boost));
      await updateVendor(vendorId, { dsslScore: finalScore });
      
      console.log(`🤖 [AI] Updated DSSL for vendor ${vendorId}: ${finalScore}`);
    } catch (error) {
      console.warn(`⚠️ [AI] DSSL refresh failed for vendor ${vendorId}:`, error);
    }
  },

  async batchGenerateContent(districtId: number): Promise<{ productsUpdated: number; vendorsUpdated: number }> {
    const vendorsInDistrict = await findVendorsByDistrict(districtId);
    
    const products = await findProductsByDistrict(districtId);

    const products = await prisma.product.findMany({
      where: { 
        vendor: { districtId },
        approved: true 
      },
      select: { id: true }
    });

    let productsUpdated = 0;
    let vendorsUpdated = 0;

    for (const product of products) {
      try {
        const district = await prisma.district.findUnique({ where: { id: districtId } });
        await this.generateProductContent(product.id, district?.slug || "shahdol");
        productsUpdated++;
      } catch {
        console.warn(`Failed to generate content for product ${product.id}`);
      }
    }

    for (const vendor of vendorsInDistrict) {
      try {
        const district = await prisma.district.findUnique({ where: { id: districtId } });
        await this.generateVendorContent(vendor.id, district?.slug || "shahdol");
        vendorsUpdated++;
      } catch {
        console.warn(`Failed to generate content for vendor ${vendor.id}`);
      }
    }

    return { productsUpdated, vendorsUpdated };
  }
};

export default aiService;
