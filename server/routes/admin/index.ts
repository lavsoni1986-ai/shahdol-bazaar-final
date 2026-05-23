import { Router } from "express";
import adminRoutes from "./admin.routes";
import aiCommandRoutes from "./ai-command.routes";
import districtMemoryRoutes from "./district-memory.routes";
import dynamicRankingRoutes from "./dynamic-ranking.routes";
import districtIntelligenceRoutes from "./district-intelligence.routes";
import migrationObservabilityRoutes from "./migration-observability.routes";

const router = Router();

// Mount all admin routes
import vendorControl from "./vendor.control";
router.use("/", adminRoutes);
router.use("/", aiCommandRoutes);
router.use("/vendors", vendorControl);
router.use("/district-memory", districtMemoryRoutes);
router.use("/dynamic-ranking", dynamicRankingRoutes);
router.use("/district-intelligence", districtIntelligenceRoutes);
router.use("/migration", migrationObservabilityRoutes);

export default router;