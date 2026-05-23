// Sovereign Auth Contracts - authoritative JWT and authenticated user shapes

export type RoleName = 'ADMIN' | 'MODERATOR' | 'USER' | 'SERVICE' | string;

export interface RoleHierarchyContract {
  role: RoleName;
  inherits?: RoleName[];
}

export interface AuthorizationScope {
  resource: string;
  actions: string[]; // e.g., ['read','write','execute']
}

export interface JWTPayloadContract {
  sub: string; // user id
  iat?: number;
  exp?: number;
  tokenVersion?: number;
  role?: RoleName;
  roles?: RoleName[];
  districtId?: number | string;
  permissions?: AuthorizationScope[];
  sessionId?: string;
  // Allow extension with caution - telemetry or trace ids
  meta?: Record<string, any>;
}

export interface AuthenticatedUserContract {
  id: string;
  canonicalId?: string;
  email?: string;
  phone?: string;
  displayName?: string;
  roles: RoleName[];
  districtId?: number | string;
  lastActiveAt?: string;
  // Derived from JWTPayloadContract but authoritative in server runtime
  tokenVersion?: number;
  permissions?: AuthorizationScope[];
  meta?: Record<string, any>;
}
