import type { Request } from "express";

/**
 * ============================================
 * 🛡️ TRUSTED E2E TEST DETECTION
 * ============================================
 * Safely bypasses rate limiting for Playwright traffic ONLY when:
 *   - NODE_ENV === "development"
 *   - AND explicitly identified via headers or user-agent
 *
 * STRICT RULES:
 * - Does NOT bypass auth, district resolution, CSRF, audit, permissions,
 *   DSSL verification, or moderation
 * - Only bypasses rate limiting
 * - Only works in development mode
 * - Does NOT trust generic localhost traffic
 * - Does NOT trust requests missing E2E headers
 * ============================================
 */
export function isTrustedE2E(req: Request): boolean {
    if (process.env.NODE_ENV !== "development") {
        return false;
    }

    const userAgent = (req.headers["user-agent"] || "").toLowerCase();
    const e2eTestHeader = req.headers["x-e2e-test"];
    const testRunnerHeader = req.headers["x-test-runner"];

    // Trust ONLY if explicitly identified as Playwright
    return (
        userAgent.includes("playwright") ||
        e2eTestHeader === "true" ||
        testRunnerHeader === "playwright"
    );
}
