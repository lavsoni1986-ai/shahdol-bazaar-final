/**
 * SOVEREIGN CSRF BOOTSTRAP
 *
 * Double-submit cookie pattern:
 * 1. Server sets httpOnly csrfToken cookie + returns token in JSON body via GET /auth/csrf-token
 * 2. We store the JSON-provided token in memory (never localStorage)
 * 3. apiRequest() attaches it as x-csrf-token header on mutating requests
 * 4. Server compares cookie (auto-sent by browser) vs header (set by us)
 *
 * SECURITY: Token lives only in module memory — NOT in React state, NOT localStorage.
 */

let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

/** Returns the current in-memory CSRF token (may be null if not yet bootstrapped) */
export function getCsrfToken(): string | null {
    return csrfToken;
}

/**
 * Fetches a fresh CSRF token from the server.
 * Deduplicates concurrent calls — only one in-flight at a time.
 * Safe to call multiple times (returns cached token if already set).
 *
 * POST /api/orders depends on this — without it, requireCSRF returns 403.
 */
export async function fetchCsrfToken(): Promise<string | null> {
    if (csrfToken) {
        console.log("[CSRF] token already cached");
        return csrfToken;
    }

    // Deduplicate: if a fetch is already in-flight, return its promise
    if (csrfPromise) {
        console.log("[CSRF] fetch already in-flight, reusing");
        return csrfPromise;
    }

    csrfPromise = (async () => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || "";
            const url = apiBase
                ? `${apiBase}/api/auth/csrf-token`
                : "/api/auth/csrf-token";

            console.log("[CSRF] fetching token...");

            const res = await fetch(url, {
                method: "GET",
                credentials: "include",
                headers: { Accept: "application/json" },
            });

            if (!res.ok) {
                console.warn("[CSRF] fetch failed:", res.status, res.statusText);
                return null;
            }

            const json = await res.json();
            const token: string | null = json?.data?.csrfToken ?? null;

            if (token) {
                csrfToken = token;
                console.log("[CSRF] token fetched and cached");
            } else {
                console.warn("[CSRF] response missing csrfToken in data", json);
            }

            return token;
        } catch (err) {
            console.warn("[CSRF] fetch error:", err);
            return null;
        } finally {
            csrfPromise = null;
        }
    })();

    return csrfPromise;
}

/** Clears the in-memory token — call on logout */
export function clearCsrfToken(): void {
    csrfToken = null;
    console.log("[CSRF] token cleared");
}
