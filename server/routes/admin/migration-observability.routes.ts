// ============================================
// MIGRATION OBSERVABILITY ENDPOINTS
// ============================================

import express, { type Request, type Response } from "express";
import { requireSuperAdmin } from "../../auth/middleware";
import { success, failure } from "../../lib/apiResponse";

const router = express.Router();

// GET MIGRATION HEALTH DASHBOARD
router.get("/migration/health", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { migrationObservability } = await import("../../services/migration-observability");
    const healthData = await migrationObservability.getHealthDashboard();

    return success(res, healthData);
  } catch (error) {
    console.error("Migration health check failed:", error);
    return failure(res, "HEALTH_CHECK_FAILED", "Migration health check failed", 500);
  }
});

// GET MIGRATION METRICS
router.get("/migration/metrics", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { migrationObservability } = await import("../../services/migration-observability");
    const metrics = await migrationObservability.getMigrationHealth();

    return success(res, metrics);
  } catch (error) {
    console.error("Migration metrics fetch failed:", error);
    return failure(res, "METRICS_FAILED", "Migration metrics fetch failed", 500);
  }
});

export default router;