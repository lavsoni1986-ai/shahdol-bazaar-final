// Frameworks
import { Router } from "express";

// Database
import { prisma } from "../storage";

// Security
import { requireAuth } from "../auth/middleware";

import { getGroq } from "../middleware/groq";
import { parseNaturalLanguage, matchIntentToVendors } from "../services/intent.service";
import { SovereignGlobalSearch } from "../services/sovereign.global.search";

const router = Router();

// 🧠 AI: Concierge Logic
router.post("/concierge", async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    // ... (आपका Groq AI लॉजिक यहाँ आएगा) ...
    res.json({ success: true, message: "AI Response" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
