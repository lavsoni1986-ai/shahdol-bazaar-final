import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { apiRequest } from "@/lib/api-client";
import { authRoutes } from "@/shared/routing/sovereign-routes";
import { fetchCsrfToken, clearCsrfToken } from "@/lib/csrf";

/* =========================
   ROLE HELPERS
========================= */

function isClientSuperAdmin(role?: string | null): boolean {
  return role?.toUpperCase() === "SUPER_ADMIN";
}

function isClientAdmin(role?: string | null): boolean {
  const r = role?.toUpperCase();
  return r === "SUPER_ADMIN" || r === "CITY_ADMIN" || r === "ADMIN";
}

export function getClientRoleRedirectPath(user: any): string {
  const r = user?.role?.toUpperCase?.().trim?.() || "";

  if (r === "SUPER_ADMIN" || r === "CITY_ADMIN" || r === "ADMIN") return "/admin";
  if (r === "MERCHANT" || r === "SELLER" || r === "VENDOR") return "/partner/dashboard";
  return "/customer-dashboard";
}

/* =========================
   TYPES
========================= */

export type AuthState = "loading" | "authenticated" | "guest";

interface User {
  id: number;
  username: string;
  role: string;
  districtId?: number | null;
  tokenVersion?: number;
  districtSlug?: string | null;
  phone?: string | null;
  name?: string | null;
  address?: string | null;
}

interface AuthContextType {
  authState: AuthState;
  isAuthenticated: boolean;
  loading: boolean;
  /** SOVEREIGN: true after first checkAuth() completes — downstream consumers can gate on this */
  initialized: boolean;
  user: User | null;
  checkAuth: () => Promise<boolean>;
  setUserData: (user: User | null) => void;
  logout: (redirectToAuth?: boolean) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDistrictAdmin: boolean;
  canManageDistrict: (districtId: number) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* =========================
   PROVIDER
========================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  const verifyInFlightRef = useRef(false);
  const hydratedRef = useRef(false);

  const hydrateAuthenticated = useCallback((payload: User) => {
    setUser(payload);
    setAuthState("authenticated");
    console.log("✅ [AUTH] authenticated:", payload.username);
  }, []);

  const hydrateGuest = useCallback(() => {
    setUser(null);
    setAuthState("guest");
    console.log("👤 [AUTH] guest mode");
  }, []);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (verifyInFlightRef.current) return false;

    verifyInFlightRef.current = true;

    try {
      console.log("🔍 [AUTH] verifying session...");
      const res = await apiRequest("GET", "/auth/verify");

      console.log("[AUTH_CONTEXT] verify response received", res);

      const userPayload =
        res?.data?.user ||
        res?.user ||
        res?.data ||
        null;

      console.log("[AUTH_CONTEXT] normalized user", userPayload);

      if (res?.success && userPayload) {
        console.log("[AUTH_CONTEXT] authState transition: authenticated");
        hydrateAuthenticated(userPayload);
        return true;
      }

      console.log("[AUTH_CONTEXT] authState transition: guest");
      hydrateGuest();
      return false;
    } catch (err: any) {
      console.error("[AUTH_CONTEXT] verify failed", err);
      console.log("[AUTH_CONTEXT] authState transition: guest");
      hydrateGuest();
      return false;
    } finally {
      verifyInFlightRef.current = false;
      // SOVEREIGN: Mark auth as initialized so downstream consumers know the first check completed
      setInitialized(true);
    }
  }, [hydrateAuthenticated, hydrateGuest]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authState === "authenticated") {
      console.log("[CSRF] Authenticated state detected, bootstrapping token...");
      fetchCsrfToken()
        .then((token) => {
          if (token) {
            console.log("[CSRF] Token fetched");
            console.log("[CSRF] Token cached");
          } else {
            console.warn("[CSRF] Bootstrap fetched null/empty token");
          }
        })
        .catch((err) => {
          console.error("[CSRF] Bootstrap error:", err);
        });
    } else if (authState === "guest") {
      console.log("[CSRF] Guest state detected, clearing token");
      clearCsrfToken();
    }
  }, [authState]);

  const logout = useCallback(
    async (redirectToAuth = true) => {
      try {
        await apiRequest("POST", "/auth/logout");
      } catch (err) {
        console.error("🔴 [AUTH] logout API failed", err);
      }

      localStorage.removeItem("user");
      setUser(null);
      hydrateGuest();
      // SOVEREIGN: Reset initialized so consumers re-gate
      setInitialized(true);

      if (redirectToAuth) {
        const currentPath = window.location.pathname;
        const isPartnerContext =
          currentPath.includes("/partner") ||
          currentPath.includes("/merchant");

        window.location.href = isPartnerContext
          ? authRoutes.partnerRegister()
          : authRoutes.home();
      }
    },
    [hydrateGuest]
  );

  const setUserData = useCallback(
    (newUser: User | null) => {
      if (newUser) hydrateAuthenticated(newUser);
      else hydrateGuest();
      setInitialized(true);
    },
    [hydrateAuthenticated, hydrateGuest]
  );

  const isAuthenticated = authState === "authenticated";
  const loading = authState === "loading";

  const isSuperAdmin = isClientSuperAdmin(user?.role);
  const isAdmin = isClientAdmin(user?.role);
  const isDistrictAdmin = isClientAdmin(user?.role);

  const canManageDistrict = useCallback(
    (districtId: number) => {
      if (isSuperAdmin) return true;
      return user?.districtId === districtId;
    },
    [isSuperAdmin, user]
  );

  const value = useMemo(
    () => ({
      authState,
      isAuthenticated,
      loading,
      initialized,
      user,
      checkAuth,
      setUserData,
      logout,
      isAdmin,
      isSuperAdmin,
      isDistrictAdmin,
      canManageDistrict,
    }),
    [
      authState,
      isAuthenticated,
      loading,
      initialized,
      user,
      checkAuth,
      setUserData,
      logout,
      isAdmin,
      isSuperAdmin,
      isDistrictAdmin,
      canManageDistrict,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* =========================
   HOOK
========================= */

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
