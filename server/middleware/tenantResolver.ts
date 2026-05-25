import type { NextFunction, Request, Response } from "express";
import { findDistrictBySlug } from "../repositories/district.repo";
import { tenantContext } from "../storage";

export const tenantResolver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let slug = req.headers["x-district-slug"];

    // =========================================
    // 0. TELEMETRY GOVERNANCE BODY FALLBACK
    // =========================================
    if (!slug && req.originalUrl && req.originalUrl.startsWith("/api/analytics/track")) {
      let body = req.body;
      if (body) {
        if (typeof body === "string") {
          try {
            body = JSON.parse(body);
          } catch {}
        }
        let rawSlug: any;
        if (Array.isArray(body)) {
          rawSlug = body[0]?.districtSlug;
        } else if (typeof body === "object" && body !== null) {
          rawSlug = (body as any).districtSlug;
        }

        // STRICT PAYLOAD SLUG VALIDATION:
        if (rawSlug !== undefined && rawSlug !== null) {
          if (typeof rawSlug === "string" && rawSlug.length >= 2 && rawSlug.length <= 50 && /^[a-z-]{2,50}$/.test(rawSlug)) {
            slug = rawSlug;
          } else {
            console.warn("🏢 [TENANT] Rejected invalid body-supplied districtSlug format:", rawSlug);
          }
        }
      }
    }

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