import { z } from "zod";
import { registerSchema } from "../lib/swagger";

/**
 * ============================================
 * AUTH DTOs - BharatOS Identity System
 * ============================================
 * Type-safe validation for authentication endpoints
 */

// ============================================
// LOGIN DTO
// ============================================
export const loginDTO = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(/^[^\s]+$/, "Username cannot contain spaces"),

  password: z.string()
    // Login must accept existing accounts even if they predate the current password policy.
    // Password policy enforcement belongs to registration/reset flows.
    .min(1, "Password is required")
    .max(100, "Password must not exceed 100 characters"),
});

// ============================================
// REGISTER DTO
// ============================================
export const registerDTO = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(/^[^\s]+$/, "Username cannot contain spaces"),

  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .max(100, "Password must not exceed 100 characters")
    .regex(/[A-Z]/, "Must have one uppercase letter")
    .regex(/[a-z]/, "Must have one lowercase letter")
    .regex(/[0-9]/, "Must have one number")
    .regex(/[!@#$%^&*(),.?\":{}|<>]/, "Must have one special character"),

  role: z.enum(["customer", "merchant"])
    .default("customer"),

  // MERCHANT PROVISIONING — blank-safe normalization
  phone: z.preprocess(
    (v) => v === "" ? undefined : v,
    z.string().optional()
  ),

  email: z.preprocess(
    (v) => v === "" ? undefined : v,
    z.string().email("Invalid email").optional()
  ),

  shopName: z.preprocess(
    (v) => v === "" ? undefined : v,
    z.string().optional()
  ),

  shopAddress: z.preprocess(
    (v) => v === "" ? undefined : v,
    z.string().optional()
  ),
});

// ============================================
// REFRESH TOKEN DTO
// ============================================
export const refreshTokenDTO = z.object({
  refreshToken: z.string()
    .min(1, "Refresh token is required"),
});

// ============================================
// LOGOUT DTO
// ============================================
export const logoutDTO = z.object({
  // Optional - can logout with or without token
}).catchall(z.any());

// ============================================
// VERIFY TOKEN RESPONSE DTO
// ============================================
export const verifyResponseDTO = z.object({
  authenticated: z.boolean(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    role: z.enum(["SUPER_ADMIN", "CITY_ADMIN", "MERCHANT", "CUSTOMER"]),
    isAdmin: z.boolean().optional(),
  }).nullable(),
});

// ============================================
// REGISTER SCHEMAS WITH OPENAPI
// ============================================
registerSchema("LoginDTO", loginDTO);
registerSchema("RegisterDTO", registerDTO);
registerSchema("RefreshTokenDTO", refreshTokenDTO);
registerSchema("VerifyResponseDTO", verifyResponseDTO);

// ============================================
// TYPE EXPORTS
// ============================================
export type LoginDTO = z.infer<typeof loginDTO>;
export type RegisterDTO = z.infer<typeof registerDTO>;
export type RefreshTokenDTO = z.infer<typeof refreshTokenDTO>;
export type LogoutDTO = z.infer<typeof logoutDTO>;
export type VerifyResponseDTO = z.infer<typeof verifyResponseDTO>;

// ============================================
// RESPONSE SCHEMAS (for documentation)
// ============================================
export const loginResponseDTO = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    role: z.enum(["SUPER_ADMIN", "CITY_ADMIN", "MERCHANT", "CUSTOMER"]),
    isAdmin: z.boolean().optional(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export const errorResponseDTO = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })).optional(),
  timestamp: z.string(),
});

export type LoginResponseDTO = z.infer<typeof loginResponseDTO>;
export type ErrorResponseDTO = z.infer<typeof errorResponseDTO>;

export default {
  loginDTO,
  registerDTO,
  refreshTokenDTO,
  logoutDTO,
  verifyResponseDTO,
  loginResponseDTO,
  errorResponseDTO,
};
