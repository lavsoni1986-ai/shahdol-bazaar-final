/**
 * UNIFIED SEARCH ROUTE — NEW PARALLEL ENDPOINT
 * 
 * This is the future unified search endpoint.
 * DO NOT modify existing search.routes.ts — keep it running.
 */

import express from "express";
import { searchController } from "../controllers/search.controller";

const router = express.Router();

/**
 * GET /api/search/unified
 * Unified search across vendors, products, and services
 * 
 * Query params:
 * - q: search query (required)
 * - districtId: district ID (from middleware)
 * 
 * Example: /api/search/unified?q=doctor&districtId=2
 */
router.get("/unified", searchController);

export default router;
