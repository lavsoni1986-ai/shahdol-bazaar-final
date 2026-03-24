/**
 * Auth Context - Centralized Authentication State
 * Moved from layout.tsx to prevent auth loop issues
 * 
 * Uses shared/roles.ts for consistent role handling across app
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";

/**
 * Role utilities - Client-side copy of shared/roles.ts (server)\r\n * NOTE: This MUST match the server-side logic in shared/roles.ts exactly.\r\n * When updating roles on server, update this file too.
 * Must match server-side logic exactly
 */
const enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CITY_ADMIN = 'CITY_ADMIN',
  MERCHANT = 'MERCHANT',
  CUSTOMER = 'CUSTOMER',
}

function normalizeClientRole(role: string | undefined | null): UserRole {
  if (!role) return UserRole.CUSTOMER;
  // Aggressive normalization: remove spaces, underscores, convert to lowercase
  const r = role.toLowerCase().replace(/[\s_]/g, '');
  if (r === 'admin' || r === 'superadmin') return UserRole.SUPER_ADMIN;
  if (r === 'cityadmin' || r === 'districtadmin') return UserRole.CITY_ADMIN;
  if (r === 'seller' || r === 'merchant' || r === 'vendor' || r === 'shopkeeper') return UserRole.MERCHANT;
  return UserRole.CUSTOMER;
}

function isClientSuperAdmin(role: string | undefined | null): boolean {
  return normalizeClientRole(role) === UserRole.SUPER_ADMIN;
}

function isClientAdmin(role: string | undefined | null): boolean {
  const r = normalizeClientRole(role);
  return r === UserRole.SUPER_ADMIN || r === UserRole.CITY_ADMIN;
}

function getClientRoleRedirectPath(user: any): string {
  // ✅ 1. अगर isAdmin सच है, तो सीधे एडमिन भेजो (Sovereign Power)
  if (user?.isAdmin === true) return '/admin/shahdol';

  const role = user?.role;
  if (!role) return '/customer-dashboard';
  
  const r = role.toUpperCase().trim(); // सबको Uppercase कर दो
  
  // ✅ 2. मज़बूत चेकिंग
  if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN' || r === 'ADMIN' || r === 'CITY_ADMIN') {
    return '/admin/shahdol';
  }
  
  if (r === 'MERCHANT' || r === 'SELLER' || r === 'VENDOR') {
    return '/partner';
  }
  
  return '/customer-dashboard';
}

export { getClientRoleRedirectPath };

/**
 * Auth State Machine - Prevents routing loops
 * Use authState instead of separate isAuthenticated + loading booleans
 */
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

interface User {
  id: number;
  username: string;
  role: string;
  shopId?: number | null;
  isAdmin?: boolean;
  isVendor?: boolean;
  districtId?: number | null; // For District Admin
  shopName?: string | null;
  shopAddress?: string | null;
  mapsLink?: string | null;
  contactNumber?: string | null;
}

function usersEqual(a: User | null, b: User | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.username === b.username &&
    a.role === b.role &&
    (a.shopId ?? null) === (b.shopId ?? null) &&
    (a.isAdmin ?? false) === (b.isAdmin ?? false) &&
    (a.isVendor ?? false) === (b.isVendor ?? false) &&
    (a.districtId ?? null) === (b.districtId ?? null)
  );
}

interface AuthContextType {
  authState: AuthState;
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  checkAuth: () => void;
  logout: () => void;
  isSuperAdmin: boolean;
  isDistrictAdmin: boolean;
  canManageDistrict: (districtId: number) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Auth state machine - prevents routing loops
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hydrationInProgress = useRef(false);
  const hasHydratedRef = useRef(false);
  const hasInitiallyCheckedRef = useRef(false);
  const retryCountRef = useRef(0);
  const previousUserRef = useRef<User | null>(null);
  const retryInProgress = useRef(false);
  const retryPromise = useRef<Promise<void> | null>(null);

  const checkAuth = useCallback(async () => {
    if (hydrationInProgress.current) return;
    hydrationInProgress.current = true;

    // SECURITY: Verify auth via server-side endpoint (uses httpOnly cookie only)
    // NO localStorage tokens - relies entirely on httpOnly cookies
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies only
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          // Server says user is authenticated - use server data only
          const serverUser = data.user;
          
          // PURE COOKIE AUTH: Rely entirely on httpOnly cookies for session
          const nextUser: User = {
            id: serverUser.id,
            username: serverUser.username,
            role: serverUser.role,
            shopId: serverUser.shopId ?? null,
            isAdmin: serverUser.isAdmin ?? false,
            isVendor: serverUser.isVendor ?? false,
            districtId: serverUser.districtId ?? null,
          };
          
          // Track previous user for retry logic
          previousUserRef.current = nextUser;
          retryCountRef.current = 0;

          setUser((prev) => (usersEqual(prev, nextUser) ? prev : nextUser));
          setIsAuthenticated(true);
          setAuthState('authenticated');
          console.log("✅ [AUTH CONTEXT] Server-verified auth:" , nextUser.username);
        } else {
          // Server says not authenticated
          // SECURITY: NO localStorage fallback
          setUser(null);
          setIsAuthenticated(false);
          setAuthState('unauthenticated');
        }
      } else if (response.status === 401) {
        // Token expired or invalid
        // AUTH STATE PERSISTENCE: If user was previously authenticated, give retry chance
        const wasAuthenticated = previousUserRef.current !== null;
        
        if (wasAuthenticated && retryCountRef.current < 2) {
          // MUTEX LOCK: Prevent concurrent retry attempts
          if (retryInProgress.current) {
            if (retryPromise.current) {
              await retryPromise.current;
            }
            return;
          }

          retryInProgress.current = true;
          retryCountRef.current += 1;
          console.log(`🔄 [AUTH CONTEXT] 401 received, retry attempt ${retryCountRef.current}/2`);

          const doRetry = async () => {
            await new Promise(resolve => setTimeout(resolve, 500 * retryCountRef.current));
            
            try {
              const retryResponse = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include',
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                if (retryData.authenticated && retryData.user) {
                  const serverUser = retryData.user;
                  const recoveredUser: User = {
                    id: serverUser.id,
                    username: serverUser.username,
                    role: serverUser.role,
                    shopId: serverUser.shopId ?? null,
                    isAdmin: serverUser.isAdmin ?? false,
                    isVendor: serverUser.isVendor ?? false,
                    districtId: serverUser.districtId ?? null,
                  };
                  setUser(recoveredUser);
                  setIsAuthenticated(true);
                  setAuthState('authenticated');
                  retryCountRef.current = 0;
                  console.log("✅ [AUTH CONTEXT] Auth recovered after retry:", recoveredUser.username);
                  return true;
                }
              }
            } catch (retryError) {
              console.log("❌ [AUTH CONTEXT] Retry failed:", retryError);
            }
            return false;
          };

          retryPromise.current = doRetry();
          const success = await retryPromise.current;
          retryPromise.current = null;
          retryInProgress.current = false;

          if (success) {
            setLoading(false);
            return;
          }
        }
        
        // All retries exhausted or user wasn't previously authenticated - clear state
        console.log("🔴 [AUTH CONTEXT] Server rejected auth - 401 (retries exhausted)");
        setUser(null);
        setIsAuthenticated(false);
        setAuthState('unauthenticated'); // 👈 ये लोडर को रोकेगी और फॉर्म दिखाएगी!
        setLoading(false);              // 👈 बैकअप के लिए इसे भी सेट करें
        retryCountRef.current = 0;
      } else {
        // Other error - throw to trigger catch block
        throw new Error(`Auth verify failed: ${response.status}`);
      }
    } catch (verifyError) {
      // PURE COOKIE AUTH: Server-driven with httpOnly cookies only
      // If server is unreachable, user is logged out (safe default)
      console.error("❌ [AUTH CONTEXT] Server verify failed - forcing logout:", verifyError);
      setUser(null);
      setIsAuthenticated(false);
      setAuthState('unauthenticated'); // 👈 यहाँ भी लोडर को मार गिराएं
      setLoading(false);
    } finally {
      hasHydratedRef.current = true;
      setLoading((prev) => (prev === false ? prev : false));
      hydrationInProgress.current = false;
    }
  }, []);

  // Run auth check only once on mount
  useEffect(() => {
    // Prevent multiple auth checks with a ref
    if (hasInitiallyCheckedRef.current) return;
    hasInitiallyCheckedRef.current = true;
    
    checkAuth();

    // Listen for storage changes only from OTHER tabs (not the same tab)
    // This prevents infinite loops when we set localStorage in this tab
    const handleStorageChange = (event: StorageEvent) => {
      // Only respond to changes from OTHER tabs, not our own
      if (event.key !== 'user' || event.newValue === null) return;
      // Don't trigger if we're in the middle of our own auth process
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []); // Empty deps - only run once on mount

  const logout = useCallback(async (redirectToAuth = false) => {
    console.log("🔴 [AUTH CONTEXT] User initiated logout");

    try {
      // Call logout API to clear server-side session
      // SECURITY: Include credentials to send httpOnly cookie to server
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: 'include'
      });
    } catch (e) {
      console.error("Logout API error:", e);
    }

    // Clear local state only (cookies handled by server)
    if (typeof window !== 'undefined') {
      // Clear district context from sessionStorage
      sessionStorage.removeItem("districtSlug");
      sessionStorage.removeItem("districtId");
    }
    
    // PURE COOKIE AUTH: Server handles cookie clearing, we only clear local state

    // Reset state - simple and direct
    setUser(null);
    setIsAuthenticated(false);
    setAuthState('unauthenticated');

    // Auto-redirect to auth page if session expired (401)
    if (redirectToAuth) {
      window.location.href = '/auth';
    }

    console.log("✅ [AUTH CONTEXT] Logout complete");
  }, []);

  // Role helper methods - use shared normalizeRole for consistency
  // This matches server-side logic from shared/roles.ts
  const isSuperAdmin = isClientSuperAdmin(user?.role) || user?.isAdmin === true;
  const isDistrictAdmin = isClientAdmin(user?.role);
  const canManageDistrict = (districtId: number) => {
    // Superadmin can manage all districts
    if (isSuperAdmin) return true;
    // District admin can only manage their assigned district
    return user?.districtId === districtId;
  };

  const value = useMemo(() => ({
    authState,
    isAuthenticated, 
    user, 
    loading, 
    checkAuth, 
    logout,
    isSuperAdmin,
    isDistrictAdmin,
    canManageDistrict
  }), [authState, isAuthenticated, user, loading, checkAuth, logout, isSuperAdmin, isDistrictAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


