import { Router } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import marketplaceRoutes from "./marketplace.routes";

const router = Router();

// Mount route modules
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/marketplace", marketplaceRoutes);

// Export the combined router
export default router;
