/**
 * Search Controller — Thin Wrapper
 */

import { Request, Response } from "express";
import { searchUnified } from "../services/searchUnified.service";
import { success, error } from "../utils/response";

export async function searchController(req: Request, res: Response) {
  try {
    const q = String(req.query.q || "").trim();
    // Allow districtId from query param for testing, fallback to req.districtId
    const districtId = req.query.districtId ? parseInt(String(req.query.districtId)) : req.districtId;

    if (!q) {
      return res.status(400).json(error("Query parameter 'q' is required"));
    }

    if (!districtId) {
      return res.status(400).json(error("District context required"));
    }

    const result = await searchUnified(q, districtId);

    return res.json(success(result));
  } catch (err: any) {
    console.error("searchController error:", err.message);
    return res.status(500).json(error("Internal server error"));
  }
}
