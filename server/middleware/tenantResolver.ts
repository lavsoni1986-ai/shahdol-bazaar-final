import type { NextFunction, Request, Response } from "express";
import { findDistrictBySlug } from "../repositories/district.repo";
import { tenantContext } from "../storage";

export const tenantResolver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.headers["x-district-slug"];

    console.log(`🏢 [TENANT] ${req.method} ${req.originalUrl} | Slug: ${slug || "MISSING"}`);

    // =========================================
    // 1. PUBLIC BYPASS ONLY
    // =========================================
    const isPublicRoute =
      req.originalUrl.startsWith("/api/health") ||
      req.originalUrl.startsWith("/api/docs") ||
      req.originalUrl.startsWith("/api/auth/") ||
      req.originalUrl.startsWith("/api/districts");

    if (isPublicRoute) {
      return next();
    }

    // =========================================
    // 2. AUTHENTICATED USER DISTRICT SUPREMACY
    // =========================================
    if ((req as any).user?.districtId) {
      const userDistrictId = (req as any).user.districtId;

      req.districtId = userDistrictId;
      req.districtSlug = null;

      (req as any).ctx = {
        ...((req as any).ctx || {}),
        districtId: userDistrictId,
        districtSlug: null,
        requestId: (req as any).requestId,
        userId: (req as any).user.id,
      };

      const store = tenantContext.getStore();
      if (store) {
        store.districtId = userDistrictId;
        store.userId = (req as any).user.id;
      }

      console.log(`🏢 [TENANT] ✅ token district resolved: ${userDistrictId}`);
      return next();
    }

    // =========================================
    // 3. HEADER DISTRICT FOR GUEST/PREAUTH ONLY
    // =========================================
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: "Sovereign Violation: x-district-slug header required",
      });
    }

    const district = await findDistrictBySlug(String(slug));

    if (!district || !district.isActive) {
      return res.status(404).json({
        success: false,
        error: "District not found or inactive",
      });
    }

    req.districtId = district.id;
    req.districtSlug = district.slug;

    (req as any).ctx = {
      ...((req as any).ctx || {}),
      districtId: district.id,
      districtSlug: district.slug,
      requestId: (req as any).requestId,
    };

    const store = tenantContext.getStore();
    if (store) {
      store.districtId = district.id;
    }

    console.log(`🏢 [TENANT] ✅ header district resolved: ${district.id} (${district.name})`);

    return next();
  } catch (err) {
    console.error("❌ TENANT ERROR:", err);
    return next(err);
  }
};