import rateLimit from 'express-rate-limit';
import { isTrustedE2E } from "../middleware/trustedE2E";

/**
 * ============================================
 * RATE LIMITING CONFIGURATION
 * ============================================
 * PHASE 1 Security Fix: Rate limiting to prevent
 * brute force attacks and DoS vulnerabilities.
 * 
 * All limiters use express-rate-limit with:
 * - standardHeaders: true (RateLimit-* headers)
 * - legacyHeaders: false (disable X-RateLimit-* headers)
 * - skipSuccessfulRequests: false (count all requests for accuracy)
 * - validate: false (disable IP validation for IPv6 compatibility)
 * 
 * IPv6 Fix: Disable validation to avoid errors with IPv6 addresses
 * (::1, ::ffff:127.0.0.1)
 */

/**
 * Login rate limiter
 * 5 attempts per 15 minutes per IP
 * 
 * WHY: Prevents brute force attacks on login endpoint
 * SECURITY: Blocks automated password guessing attempts
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count ALL requests including successful
  validate: false,
  keyGenerator: (req) => {
    // Use IP + username combo for better security
    // Normalize IPv6 localhost to IPv4 to avoid rate limit bypass
    let ip = req.ip || req.socket?.remoteAddress || 'unknown';

    // Normalize IPv6 localhost addresses to a consistent format
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
      ip = '127.0.0.1';
    }

    const username = req.body?.username || 'anonymous';
    return `${ip}:${username}`;
  }
});

/**
 * Registration rate limiter
 * 3 registrations per hour per IP
 * 
 * WHY: Prevents mass account creation and spam
 * SECURITY: Limits automated registration attacks
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: {
    success: false,
    message: "Too many accounts created. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  validate: false,
});

/**
 * Refresh token rate limiter
 * 10 attempts per hour per IP
 * 
 * WHY: Prevents token refresh abuse
 * SECURITY: Limits token rotation attacks
 */
export const refreshTokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: {
    success: false,
    message: "Too many token refresh attempts. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

/**
 * Mutation rate limiter
 * 100 mutations per hour per IP
 * 
 * WHY: Prevents data flooding and abuse of write endpoints
 * SECURITY: Protects against spam and automated data creation
 * Applied to: POST /api/orders, POST /api/products, POST /api/inquiries
 */
export const mutationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 mutations per hour
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

/**
 * Admin operations rate limiter
 * 50 admin actions per hour per user
 *
 * WHY: Prevents admin endpoint abuse and ensures responsible usage
 * SECURITY: Protects critical admin operations from automated attacks
 * Applied to: All admin approval/rejection endpoints
 */
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 admin actions per hour
  message: {
    success: false,
    message: "Too many admin actions. Please try again later.",
    code: "ADMIN_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  validate: false,
  keyGenerator: (req) => {
    // Rate limit by user ID, not IP (since admins may share IPs)
    return `admin_${req.ctx?.userId || 'unknown'}`;
  }
});

/**
 * General API rate limiter
 * 1000 requests per hour per IP
 *
 * WHY: Baseline protection for all API endpoints
 * SECURITY: Prevents general DoS attacks
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  // Skip health checks and trusted E2E test traffic (development only)
  skip: (req) => req.path === '/api/health' || isTrustedE2E(req)
});

/**
 * Export all limiters as a group for easy application
 */
export const rateLimiters = {
  loginLimiter,
  registerLimiter,
  refreshTokenLimiter,
  mutationLimiter,
  apiLimiter,
  adminRateLimiter
};

export default rateLimiters;
