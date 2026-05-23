/**
 * AI PROVIDER MANAGER ADMIN ROUTES
 * Administrative endpoints for sovereign AI provider governance
 */

import express from "express";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { success, error } from "../../utils/response";
import { aiProviderManager, AIProvider } from "../../ai/provider-manager";

const router = express.Router();

// Apply auth middleware
router.use(requireAuth);
router.use(requireSuperAdmin);

/**
 * GET /api/admin/ai-providers/status
 * Get comprehensive AI provider status and health
 */
router.get("/status", async (req, res) => {
  try {
    const healthStatus = aiProviderManager.getProviderHealth();
    const capabilityMatrix = aiProviderManager.getCapabilityMatrix();
    const availableProviders = aiProviderManager.getAvailableProviders();
    const cognitiveRouting = aiProviderManager.getCognitiveRoutingStatus();
    const failoverStatus = aiProviderManager.getFailoverStatus();

    return success(res, {
      healthStatus,
      capabilityMatrix,
      availableProviders,
      cognitiveRouting,
      failoverStatus,
      summary: {
        totalProviders: Object.values(AIProvider).length,
        healthyProviders: availableProviders.length,
        healthyTasks: cognitiveRouting.filter(r => r.healthy).length,
        totalTasks: cognitiveRouting.length,
        failoverReadyTasks: failoverStatus.filter(f => f.allHealthy).length
      }
    });
  } catch (err: any) {
    console.error("AI provider status error:", err.message);
    return res.status(500).json(error("Failed to fetch AI provider status"));
  }
});

/**
 * GET /api/admin/ai-providers/capabilities
 * Get capability matrix in readable format
 */
router.get("/capabilities", async (req, res) => {
  try {
    const matrix = aiProviderManager.getCapabilityMatrix();

    // Convert to readable format
    const readableMatrix = {
      description: "AI Provider Capability Matrix for BharatOS",
      providers: Object.entries(matrix).map(([provider, capabilities]) => ({
        provider,
        capabilities: capabilities.join(', ')
      })),
      legend: {
        chat: "Text conversation",
        vision: "Image analysis",
        fast: "Low latency responses",
        cheap: "Cost-effective",
        reasoning: "Complex problem solving",
        multimodal: "Multiple input types"
      }
    };

    return success(res, readableMatrix);
  } catch (err: any) {
    console.error("AI capabilities error:", err.message);
    return res.status(500).json(error("Failed to fetch AI capabilities"));
  }
});

/**
 * GET /api/admin/ai-providers/config
 * Get provider configurations (sensitive data redacted)
 */
router.get("/config", async (req, res) => {
  try {
    const configs = Object.values(AIProvider).map(provider => {
      const config = aiProviderManager.getProviderConfig(provider);
      return {
        provider,
        models: config.models,
        capabilities: config.capabilities,
        priority: config.priority,
        costPerToken: config.costPerToken,
        rateLimit: config.rateLimit,
        hasApiKey: !!config.apiKey
      };
    });

    return success(res, configs);
  } catch (err: any) {
    console.error("AI provider config error:", err.message);
    return res.status(500).json(error("Failed to fetch AI provider config"));
  }
});

/**
 * POST /api/admin/ai-providers/validate
 * Manually trigger provider validation
 */
router.post("/validate", async (req, res) => {
  try {
    const { provider } = req.body as { provider?: AIProvider };

    if (provider) {
      // Validate specific provider
      const health = await aiProviderManager['validateProvider'](provider);
      aiProviderManager['healthStatus'].set(provider, health);

return success(res, {
         provider,
         healthy: health.healthy,
         latency: health.latency,
         error: health.error
       });
    } else {
      // Validate all providers
      const results = await aiProviderManager['validateAllProviders']();
      return res.json(success(results));
    }
  } catch (err: any) {
    console.error("AI provider validation error:", err.message);
    return res.status(500).json(error("Failed to validate AI providers"));
  }
});

/**
 * GET /api/admin/ai-providers/routing
 * Get current cognitive routing configuration and status
 */
router.get("/routing", async (req, res) => {
  try {
    const routing = aiProviderManager.getCognitiveRoutingStatus();
    const failoverStatus = aiProviderManager.getFailoverStatus();

    return success(res, {
      routing,
      failoverStatus,
      summary: {
        healthyTasks: routing.filter(r => r.healthy).length,
        totalTasks: routing.length,
        failoverReadyTasks: failoverStatus.filter(f => f.allHealthy).length
      }
    });
  } catch (err: any) {
    console.error("AI routing config error:", err.message);
    return res.status(500).json(error("Failed to fetch AI routing config"));
  }
});

export default router;