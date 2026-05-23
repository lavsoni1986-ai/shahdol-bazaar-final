// Frameworks
import { Router } from "express";

// Database
import { prisma } from "../storage";

// Security
import { requireAuth } from "../auth/middleware";

import { getGroq } from "../middleware/groq";
import { parseNaturalLanguage, matchIntentToVendors } from "../services/intent.service";
import { SovereignGlobalSearch } from "../services/sovereign.global.search";
import { cognitiveParseQuery, buildFollowup } from "../services/cognitive.query.engine";
import { ErrorCode, sendError, sendSuccess } from "../middleware/errorHandler";
import { normalizeQueryLegacy } from "../lib/cognition/normalize";
import {
  updateDistrictDemandMemory,
  updateDistrictSupplyGap,
  updateEconomicCluster,
  updateSharedLearning,
} from "../services/district-intelligence.service";
import {
  trackCallVendor,
  trackWhatsappVendor,
  trackOpenMaps,
  trackBookingIntent,
} from "../services/execution-telemetry.service";

const router = Router();

// --- AI CONVERSATION ENDPOINT ---
router.post("/concierge", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, "Message must be at least 2 characters");
    }

    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context required");
    }

    const district = await prisma.district.findUnique({
      where: { id: districtId }
    });

    const rawQuery = normalizeQueryLegacy(message);

    // Defensive fallback logging
    if (!rawQuery) {
      console.warn('[COGNITION] Empty normalized query for message:', message);
    }

    // ============================================
    // SUPER BRAIN COGNITIVE PARSE
    // ============================================
    const cognition = cognitiveParseQuery(rawQuery);
    const searchTerms = cognition.searchTerms;

    // Share high-confidence patterns across districts
    if (cognition.confidence > 0.8) {
      void updateSharedLearning({
        districtId,
        areaKey: district?.slug || "unknown",
        domain: cognition.domain || "GENERAL",
        searchTerms,
        vendorIds: [],
        productIds: [],
        successScore: cognition.confidence,
        responseMode: cognition.responseMode,
      });
        }
      });
    }

    // Update economic cluster and heat signals on every query
    const areaKey = "district_wide"; // TODO: use locality
    await prisma.districtEconomicCluster.upsert({
      where: {
        districtId_domain: {
          districtId,
          domain: cognition.domain || "GENERAL"
        }
      },
      update: {
        totalSearches: { increment: 1 }
      },
      create: {
        districtId,
        domain: cognition.domain || "GENERAL",
        totalSearches: 1
      }
    });
    await prisma.districtHeatSignal.upsert({
      where: {
        districtId_areaKey_domain: {
          districtId,
          areaKey,
          domain: cognition.domain || "GENERAL"
        }
      },
      update: {
        searches: { increment: 1 },
        emergencyCount: cognition.responseMode === "EMERGENCY_ESCALATION" ? { increment: 1 } : undefined
      },
      create: {
        districtId,
        areaKey,
        domain: cognition.domain || "GENERAL",
        searches: 1,
        emergencyCount: cognition.responseMode === "EMERGENCY_ESCALATION" ? 1 : 0
      }
    });

    // ============================================
    // STEP 3: GROUND VENDORS FROM EXPANDED SEARCH TERMS
    // ============================================
    const vendors = await prisma.vendor.findMany({
      where: {
        districtId,
        isAiIndexed: true,
        status: "APPROVED",
        OR: searchTerms.map(term => ({
          searchText: {
            contains: term,
            mode: "insensitive"
          }
        }))
      },
      orderBy: [
        { aiRankScore: "desc" },
        { dsslScore: "desc" },
        { rating: "desc" }
      ],
      take: 5
    });

    // ============================================
    // STEP 4: GROUND PRODUCTS FROM EXPANDED SEARCH TERMS
    // ============================================
    const products = await prisma.product.findMany({
      where: {
        districtId,
        isAiIndexed: true,
        approved: true,
        OR: searchTerms.map(term => ({
          searchText: {
            contains: term,
            mode: "insensitive"
          }
        }))
      },
      include: {
        vendor: true
      },
      orderBy: [
        { aiRankScore: "desc" },
        { isTrending: "desc" }
      ],
      take: 5
    });

    // ============================================
    // STEP 4: LOG USER EVENT MEMORY + QUERY INTELLIGENCE
    // ============================================
    await prisma.userEvent.create({
      data: {
        userId: req.user?.id || null,
        vendorId: vendors[0]?.id || null,
        productId: products[0]?.id || null,
        sessionId: req.headers["x-session-id"]?.toString() || `anon_${Date.now()}`,
        action: "ai_concierge_search",
        districtId,
        queryText: rawQuery,
        parsedIntent: cognition.actionability,
        parsedCategory: cognition.domain,
        matchedVendorIds: vendors.map(v => v.id),
        matchedProductIds: products.map(p => p.id),
        converted: false,
        confidenceScore: cognition.confidence
      }
    });

    await prisma.queryIntelligence.create({
      data: {
        rawQuery,
        normalized: cognition.normalized,
        districtId,
        domain: cognition.domain,
        entity: cognition.entity,
        temporal: cognition.temporal,
        urgency: cognition.urgency,
        actionability: cognition.actionability,
        fulfillment: cognition.fulfillment,
        confidence: cognition.confidence,
        source: "AI_CONCIERGE",
        responseMode: cognition.responseMode,
        followupGenerated: !hasGroundedData || cognition.responseMode === "FOLLOWUP_REQUIRED"
      }
    });

    // ============================================
    // STEP 5: NO DATA FOUND
    // ============================================
    const hasGroundedData = vendors.length > 0 || products.length > 0;

    if (hasGroundedData && cognition.responseMode === "FOLLOWUP_REQUIRED") {
      const answer = buildFollowup(cognition);
      const response = {
        success: true,
        grounded: true,
        cognition,
        answer,
        results: vendors.map(v => {
          const actions = [];
          if (v.phone) {
            actions.push({ type: "CALL", label: "📞 Call", value: v.phone, priority: 1 });
          }
          if (v.mobile || v.phone) {
            actions.push({ type: "WHATSAPP", label: "🟢 WhatsApp", value: v.mobile || v.phone, priority: 2 });
          }
          if (v.address) {
            const mapUrl = v.mapsLink || `https://maps.google.com/?q=${encodeURIComponent(v.address)}`;
            actions.push({ type: "MAPS", label: "📍 Directions", value: mapUrl, priority: 3 });
          }
          if (v.phone) {
            actions.push({ type: "NOTIFY", label: "🔔 Notify", value: v.phone, priority: 4 });
          }
          console.log("VENDOR_MAPPED", { id: v.id, actions: actions.length });
          return {
            id: v.id,
            name: v.name,
            category: v.category,
            address: v.address,
            phone: v.phone,
            mobile: v.mobile,
            dsslScore: v.dsslScore,
            aiRankScore: v.aiRankScore,
            verified: v.isVerified,
            responseMode: cognition.responseMode,
            actions
          };
        }),
        products: products.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          vendorId: p.vendorId,
          vendorName: p.vendor?.name || null,
          actions: {
            canBuy: true,
            canCallVendor: !!(p.vendor?.phone || p.vendor?.mobile)
          }
        }))
      };
      console.log("FINAL_AI_RESPONSE", JSON.stringify(response.results?.[0], null, 2));
      return res.json(response);
    }

    if (!hasGroundedData) {
      cognition.responseMode = "SUPPLY_GAP";
      console.log("MEMORY_DEBUG", {
        districtId: req.ctx.districtId,
        domain: cognition.domain,
        entity: cognition.entity,
        grounded: hasGroundedData,
      });
      // Store district demand memory
      void updateDistrictDemandMemory({
        districtId,
        domain: cognition.domain,
        entity: cognition.entity,
        query: rawQuery,
      });

      // Update supply gap intelligence
      const urgencyScore = cognition.urgency === "HIGH" ? 1.0 : cognition.urgency === "MEDIUM" ? 0.5 : 0.0;
      const demandCount = 1; // for new, or get from update
      const trendScore = Math.min(demandCount / 10, 1.0); // simple
      const onboardingReady = demandCount > 10 && urgencyScore > 0.5;
      await prisma.districtSupplyGap.upsert({
        where: {
          districtId_domain_entity: {
            districtId,
            domain: cognition.domain || "GENERAL",
            entity: cognition.entity || "UNKNOWN"
          }
        },
        update: {
          demandCount: { increment: 1 },
          urgencyScore,
          trendScore,
          onboardingReady
        },
        create: {
          districtId,
          domain: cognition.domain || "GENERAL",
          entity: cognition.entity || "UNKNOWN",
          demandCount: 1,
          urgencyScore,
          trendScore,
          onboardingReady
        }
      });
      const answer = buildFollowup(cognition) + "\n\nThis demand has been recorded. BharatOS may onboard mobile repair vendors in this area soon.";
      return res.json({
        success: true,
        grounded: false,
        cognition,
        answer,
        results: [],
        products: []
      });
    }

    // ============================================
    // STEP 6: BUILD GROUND CONTEXT FOR GROQ
    // ============================================
    const vendorContext = vendors
      .map(v => `${v.name} (${v.category}) Trust:${v.dsslScore} Rank:${v.aiRankScore}`)
      .join("\n");

    const productContext = products
      .map(p => `${p.title} ₹${p.price || 0} at ${p.vendor?.name || "Vendor"}`)
      .join("\n");

    const groq = getGroq();

    let answer = `I found ${vendors.length + products.length} grounded results in ${district?.name || "your district"}.`;

    if (groq) {
      const prompt = `You are BharatOS Sovereign District AI for ${district?.name || "this district"}.Cognitive Understanding:Domain: ${cognition.domain}Entity: ${cognition.entity}Temporal: ${cognition.temporal}Urgency: ${cognition.urgency}Actionability: ${cognition.actionability}Fulfillment Goal: ${cognition.fulfillment}User asked: ${rawQuery}Verified Vendors:${vendorContext || "None"}Verified Products:${productContext || "None"}Rules:- respond in helpful Hindi/Hinglish- only use provided verified data- understand urgency from cognitive context- guide user toward action- do not invent vendors- NEVER invent products, offers, merchants, or prices- if no verified vendor exists, clearly say verified data unavailable- NEVER create fictional commerce suggestions- keep under 100 words`;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 120
      });

      answer = response.choices[0]?.message?.content || answer;
    }

    // ============================================
    // STEP 7: RETURN GROUNDED PAYLOAD
    // ============================================
    return res.json({
      success: true,
      answer,
      results: vendors.map(v => {
        const actions = [];
        if (v.phone) {
          actions.push({ type: "CALL", label: "📞 Call", value: v.phone, priority: 1 });
        }
        if (v.mobile || v.phone) {
          actions.push({ type: "WHATSAPP", label: "🟢 WhatsApp", value: v.mobile || v.phone, priority: 2 });
        }
        if (v.address) {
          const mapUrl = v.mapsLink || `https://maps.google.com/?q=${encodeURIComponent(v.address)}`;
          actions.push({ type: "MAPS", label: "📍 Directions", value: mapUrl, priority: 3 });
        }
        return {
          id: v.id,
          name: v.name,
          category: v.category,
          address: v.address,
          phone: v.phone,
          mobile: v.mobile,
          dsslScore: v.dsslScore,
          aiRankScore: v.aiRankScore,
          verified: v.isVerified,
          responseMode: cognition.responseMode,
          actions
        };
      }),
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        vendorId: p.vendorId,
        vendorName: p.vendor?.name || null,
        actions: {
          canBuy: true,
          canCallVendor: !!(p.vendor?.phone || p.vendor?.mobile)
        }
      })),
      grounded: true,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("🚨 [SOVEREIGN AI CONCIERGE ERROR]:", error?.message);
    return res.status(500).json({
      error: "AI concierge failed",
      message: error?.message
    });
  }
});

// --- AI CLICK LEARNING ENDPOINT ---
router.post("/click-learn", async (req: Request, res: Response) => {
  try {
    const { vendorId, productId, action = "click" } = req.body;
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return res.status(400).json({ error: "District required" });
    }

    await prisma.userEvent.create({
      data: {
        userId: req.user?.id || null,
        vendorId: vendorId || null,
        productId: productId || null,
        sessionId: req.headers["x-session-id"]?.toString() || `anon_${Date.now()}`,
        action: `ai_${action}`,
        districtId,
        queryText: null,
        parsedIntent: action.toUpperCase(),
        matchedVendorIds: vendorId ? [vendorId] : [],
        matchedProductIds: productId ? [productId] : [],
        converted: false,
        confidenceScore: 0.55
      }
    });

    // lightweight score bumps
    if (vendorId) {
      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          aiRankScore: { increment: 0.8 }
        }
      });
    }

    if (productId) {
      await prisma.product.update({
        where: { id: productId },
        data: {
          aiRankScore: { increment: 0.6 },
          viewCount: { increment: 1 }
        }
      });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("AI click learn error:", error?.message);
    return res.status(500).json({ error: "Click learn failed" });
  }
});

// --- AI ACTION EXECUTION TELEMETRY ---
router.post("/action-learn", async (req: Request, res: Response) => {
  try {
    const { vendorId, actionType, query } = req.body;
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return res.status(400).json({ error: "District required" });
    }

    if (actionType === "CALL_VENDOR") {
      void trackCallVendor({
        userId: req.user?.id,
        vendorId,
        query,
        districtId,
        sessionId: req.headers["x-session-id"]?.toString() || `anon_${Date.now()}`,
      });
    } else if (actionType === "WHATSAPP_VENDOR") {
      void trackWhatsappVendor({
        userId: req.user?.id,
        vendorId,
        query,
        districtId,
        sessionId: req.headers["x-session-id"]?.toString() || `anon_${Date.now()}`,
      });
    } else if (actionType === "OPEN_MAPS") {
      void trackOpenMaps({
        userId: req.user?.id,
        vendorId,
        query,
        districtId,
        sessionId: req.headers["x-session-id"]?.toString() || `anon_${Date.now()}`,
      });
    } else if (actionType === "BOOK_VENDOR") {
      void trackBookingIntent({
        userId: req.user?.id,
        vendorId,
        query,
        districtId,
        sessionId: req.headers["x-session-id"]?.toString() || `anon_${Date.now()}`,
      });
    }

    // Update economic cluster and heat signals for actions
    let domain = "GENERAL";
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { category: true }
      });
      if (vendor?.category === "HOSPITAL") domain = "HEALTHCARE";
      // Add more mappings as needed
    }
    await prisma.districtEconomicCluster.upsert({
      where: {
        districtId_domain: {
          districtId,
          domain
        }
      },
      update: {
        totalActions: { increment: 1 }
      },
      create: {
        districtId,
        domain,
        totalActions: 1
      }
    });
    const areaKey = "district_wide";
    let updateData: any = {};
    if (actionType === "CALL_VENDOR") updateData.calls = { increment: 1 };
    else if (actionType === "WHATSAPP_VENDOR") updateData.directions = { increment: 1 }; // wait, directions for maps
    else if (actionType === "OPEN_MAPS") updateData.directions = { increment: 1 };
    if (Object.keys(updateData).length > 0) {
      await prisma.districtHeatSignal.upsert({
        where: {
          districtId_areaKey_domain: {
            districtId,
            areaKey,
            domain
          }
        },
        update: updateData,
        create: {
          districtId,
          areaKey,
          domain,
          ...updateData
        }
      });
    }

    // AI ranking mutation based on action (with anti-spam)
    if (vendorId) {
      let increment = 0;
      if (actionType === "CALL_VENDOR") {
        increment = 1.5;
      } else if (actionType === "WHATSAPP_VENDOR") {
        increment = 1.2;
      } else if (actionType === "OPEN_MAPS") {
        increment = 0.8;
      }
      if (increment > 0) {
        // Anti-spam: check if same user/vendor/action in last 1 hour
        const recentCount = await prisma.userEvent.count({
          where: {
            userId: req.user?.id || null,
            vendorId,
            action: actionType,
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
            }
          }
        });
        if (recentCount === 0) {
          const updateData: any = { aiRankScore: { increment } };
          if (actionType === "CALL_VENDOR") updateData.callConversionScore = { increment: 1 };
          else if (actionType === "WHATSAPP_VENDOR") updateData.whatsappConversionScore = { increment: 1 };
          else if (actionType === "OPEN_MAPS") updateData.navigationIntentScore = { increment: 1 };
          await prisma.vendor.update({
            where: { id: vendorId },
            data: updateData
          });
        }
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("ACTION LEARN ERROR", error);
    return res.status(500).json({ success: false });
  }
});

// 🎤 AI: Voice Intent Search
router.post("/voice-search", async (req: Request, res: Response) => {
  try {
    const { text, voiceTranscript, districtId = 1 } = req.body;

    if (!text && !voiceTranscript) {
      return res.status(400).json({ error: "Text or voice transcript required" });
    }

    // Parse natural language into structured intent
    const intentQuery = await parseNaturalLanguage(text, voiceTranscript, districtId);

    // Match intent to vendors using relevance formula
    const matches = await matchIntentToVendors(intentQuery, districtId);

    // Log the voice search for AI training
    await prisma.eventLog.create({
      data: {
        type: "voice_search",
        districtId,
        metadata: {
          intent: intentQuery.intent,
          keywords: intentQuery.keywords,
          urgency: intentQuery.urgency,
          timeContext: intentQuery.timeContext,
          matchCount: matches.length
        }
      }
    });

    res.json({
      success: true,
      intent: intentQuery,
      results: matches,
      message: `Found ${matches.length} matches for your ${intentQuery.intent} request`
    });
  } catch (error: any) {
    console.error("Voice search error:", error);
    res.status(500).json({ error: "Voice search failed" });
  }
});

// 🔍 AI: Vector Search
router.post("/vector-search", requireAuth, async (req: Request, res: Response) => {
  try {
    // ... (वेक्टर सर्च लॉजिक) ...
    res.json({ success: true, results: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 📈 AI: Trending Data
router.get("/trending", requireAuth, async (req: Request, res: Response) => {
  try {
    // ... (ट्रेंडिंग लॉजिक) ...
    res.json({ success: true, trending: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 🖱️ AI: Click Tracking
router.post("/click", requireAuth, async (req: Request, res: Response) => {
  try {
    // ... (ट्रैकिंग लॉजिक) ...
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 🛡️ BHARAT-OS: यह लाइन फाइल के अंत में, सबसे बाहर होनी चाहिए
// Sovereign Global Search
router.post("/global-search", async (req: Request, res: Response) => {
  try {
    const { query, districtId, voiceTranscript, maxDistance = 100 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const results = await SovereignGlobalSearch.globalIntentSearch(
      query,
      districtId || 1,
      voiceTranscript,
      maxDistance
    );

    res.json({
      success: true,
      query,
      districtId: districtId || 1,
      results
    });
  } catch (error) {
    console.error("Global search error:", error);
    res.status(500).json({ error: "Global search failed" });
  }
});

export default router;
