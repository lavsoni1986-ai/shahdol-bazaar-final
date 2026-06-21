/**
 * SOVEREIGN API CLIENT
 * One canonical API contract for full BharatOS frontend.
 *
 * SOVEREIGN FIX: Relaxed contract validation.
 * Previously required "success" in result which caused crashes when
 * backend returned non-standard response shapes. Now accepts:
 * - { success: true, data: ... }
 * - { data: ... }
 * - { user: ... } (for auth endpoints)
 * - { token: ... } (for login responses)
 */

import { extractDistrictSlug } from "@/shared/routing/reserved-routes";
import { getCsrfToken } from "./csrf";

function serializeBody(body?: any) {
  if (body === undefined || body === null) return undefined;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

export function resolveCanonicalDistrictSlug(): string {
  if (typeof window === "undefined") return "shahdol";

  const urlSlug = extractDistrictSlug(window.location.pathname);
  if (urlSlug) {
    try {
      localStorage.setItem("districtSlug", urlSlug);
    } catch { }
    return urlSlug;
  }

  const savedSlug = localStorage.getItem("districtSlug");
  if (savedSlug) return savedSlug;

  return "shahdol";
}

/**
 * SOVEREIGN: Check if a response is valid
 * Accepts multiple response shapes to handle backend inconsistencies gracefully.
 */
function isValidApiResponse(result: any): boolean {
  if (!result) return false;
  // Standard: { success: true/false, data: ... }
  if ("success" in result) return true;
  // Auth endpoints: { user: ... } or { token: ... }
  if (result.user || result.token) return true;
  // Data-only: { data: ... }
  if ("data" in result) return true;
  // Array response (some endpoints return arrays directly)
  if (Array.isArray(result)) return true;
  return false;
}

export function normalizeApiUrl(baseUrl: string, endpoint: string): string {
  // If endpoint is an absolute URL, return it directly but normalize slashes after the domain
  const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(endpoint.trim());
  if (isAbsolute) {
    const protocolMatch = endpoint.match(/^https?:\/\//i);
    if (protocolMatch) {
      const protocol = protocolMatch[0];
      const rest = endpoint.slice(protocol.length);
      return protocol + rest.replace(/\/+/g, "/");
    }
    return endpoint;
  }
  
  // Otherwise resolve relative to baseUrl
  const cleanBase = (baseUrl || "").trim().replace(/\/+$/, "");
  const cleanEndpoint = endpoint.trim().replace(/^\/*(api\/+)*/, "");
  
  let resolvedBase = cleanBase;
  if (!resolvedBase) {
    if (typeof window !== "undefined") {
      resolvedBase = window.location.origin;
    } else {
      resolvedBase = "";
    }
  }
  
  let apiPath = resolvedBase;
  if (apiPath && !apiPath.endsWith("/api") && !apiPath.includes("/api/")) {
    apiPath = `${apiPath}/api`;
  } else if (!apiPath) {
    apiPath = "/api";
  }
  
  const finalUrl = `${apiPath}/${cleanEndpoint}`;
  const protocolMatch = finalUrl.match(/^https?:\/\//i);
  if (protocolMatch) {
    const protocol = protocolMatch[0];
    const rest = finalUrl.slice(protocol.length);
    return protocol + rest.replace(/\/+/g, "/");
  }
  
  return finalUrl.replace(/\/+/g, "/");
}

export async function apiRequest(
  method: string, 
  endpoint: string, 
  body?: any,
  options?: { signal?: AbortSignal; headers?: Record<string, string> }
) {
  const apiBase = import.meta.env.VITE_API_URL || "";
  const url = normalizeApiUrl(apiBase, endpoint);

  const headers: Record<string, string> = {
    "x-district-slug": resolveCanonicalDistrictSlug(),
    ...options?.headers,
  };

  const csrfToken = getCsrfToken();
  if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    headers["x-csrf-token"] = csrfToken;
    console.log("[CSRF] Header attached");
  }

  if (!(typeof FormData !== "undefined" && body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers,
      body: serializeBody(body),
      signal: options?.signal,
    });
  } catch (fetchError: any) {
    console.error("❌ Network error in apiRequest:", fetchError);
    throw new Error(fetchError?.message || "Network error");
  }

  const text = await res.text();

  let result: any;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    console.error("❌ Non JSON API response:", text);
    throw new Error("Invalid server response");
  }

  // SOVEREIGN: Relaxed contract check — don't throw if "success" is missing
  // Previously threw Error("Invalid API contract") which crashed callers
  if (!isValidApiResponse(result)) {
    console.warn("⚠️ Non-standard API response shape (no success/data/user/token field):", result);
    // SOVEREIGN: Instead of throwing, wrap in success:true structure
    // This prevents crashes while still logging the anomaly
    result = { success: true, data: result };
  }

  if (!res.ok) {
    const errorMessage =
      typeof result?.error === "string"
        ? result.error
        : result?.error?.message || "API Error";
    // SOVEREIGN: Attach status code for caller inspection
    const error = new Error(errorMessage) as any;
    error.statusCode = res.status;
    throw error;
  }

  return result;
}

export function getData<T = any>(res: any): T | null {
  // SOVEREIGN: More robust data extraction
  if (res?.data) return res.data as T;
  if (res?.user) return res.user as T;
  if (Array.isArray(res)) return res as unknown as T;
  return (res ?? null) as T | null;
}

export function getArrayData<T = any>(res: any): T[] {
  if (Array.isArray(res?.data)) return res.data as T[];
  if (Array.isArray(res)) return res as T[];
  return [];
}

export function persistPortalContext(role: "partner" | "customer") {
  try {
    localStorage.setItem("portalContext", role);
  } catch { }
}

export function getPortalContext(): "partner" | "customer" {
  try {
    return (localStorage.getItem("portalContext") as any) || "customer";
  } catch {
    return "customer";
  }
}
