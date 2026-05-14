import express, { type Request, type Response } from "express";
import { hashPassword, verifyPassword } from "../auth/password";
import { generateTokenPair, verifyRefreshToken } from "../auth/jwt";
import { loginDTO, registerDTO, refreshTokenDTO } from "../dto/auth.dto";
import { normalizeRole } from "../../shared/roles";
import { registerLimiter, loginLimiter } from "../auth/rateLimiter";
import { requireAuth, optionalAuth } from "../auth/middleware";
import { findUserByUsername, findUserById, updateUser, createUser } from "../repositories/user.repo";
import { findDistrictBySlug } from "../repositories/district.repo";
import { findTransactionsByUserId, countTransactionsByUserId } from "../repositories/transaction.repo";
import crypto from "crypto";

const router = express.Router();

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = loginDTO.parse(req.body);

    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const isPasswordValid = verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // 🔐 Generate tokens with current version
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
      districtId: user.districtId,
      tokenVersion: user.tokenVersion,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("🔐 [LOGIN] Setting cookies:");
      console.log("🔐 [LOGIN] accessToken:", tokens.accessToken.substring(0, 20) + "...");
      console.log("🔐 [LOGIN] refreshToken:", tokens.refreshToken.substring(0, 20) + "...");
    }

    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" as const : "lax" as const, // ✅ lax for localhost, none for production
      path: "/",
    };

    // Set httpOnly cookie for access token
    res.cookie("accessToken", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token as httpOnly cookie (7 days)
    res.cookie("refreshToken", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log("🍪 [LOGIN] Cookies set on response");

    // Return user data only (tokens are in cookies)
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: normalizeRole(user.role),
          isAdmin: user.isAdmin,
          districtId: user.districtId
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/register", registerLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, role } = registerDTO.parse(req.body);

    // ✅ Enforce district from header (x-district-slug) - client sends this
    const slug = req.headers["x-district-slug"] as string;
    if (!slug) {
      return res.status(400).json({ success: false, error: "District slug required" });
    }

    // Get district ID from database
    const district = await findDistrictBySlug(slug);
    if (!district) {
      return res.status(400).json({ success: false, error: "Invalid district" });
    }

    // 🛡️ RACE CONDITION FIX: Check for duplicate username
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ success: false, error: "Username already exists" });
    }

    const hashedPassword = hashPassword(password);
    const user = await createUser({
      username,
      password: hashedPassword,
      role: normalizeRole(role || "customer"),
      districtId: district.id // 🔒 Strictly server-enforced from validated slug
    });

    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
      districtId: user.districtId,
      tokenVersion: user.tokenVersion,
    });

    const isProd = process.env.NODE_ENV === "production";

    // 🛡️ SOVEREIGN COOKIE FIX: Use lax for localhost development
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" as const : "lax" as const,
      path: "/",
    };

    // Set httpOnly cookie for access token
    res.cookie("accessToken", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token as httpOnly cookie (7 days)
    res.cookie("refreshToken", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data only (tokens are in cookies)
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: normalizeRole(user.role),
          isAdmin: user.isAdmin,
          districtId: user.districtId
        }
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: "Invalid input", details: error.errors });
    }
    return res.status(500).json({ success: false, error: "Registration failed" });
  }
});

router.get("/csrf-token", requireAuth, async (req: any, res: Response) => {
  try {
    // Generate CSRF token for authenticated users
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" as const : "lax" as const, // ✅ lax for localhost
      path: "/",
    };

    // Store token in httpOnly cookie for double-submit cookie pattern
    res.cookie("csrfToken", csrfToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Return token to client for header inclusion
    return res.json({
      success: true,
      data: { csrfToken }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "CSRF token generation failed" });
  }
});

router.post("/logout", requireAuth, async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: "Unauthorized" });
    // 🔐 Invalidates tokens on logout
    await updateUser(req.ctx?.userId!, { tokenVersion: { increment: 1 } });

    // Clear both access and refresh token cookies with same options as set
    const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" as const : "lax" as const, // lax for local, none for production
      path: "/",
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    return res.json({ success: true, data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Logout failed" });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    // Read refresh token from httpOnly cookie instead of body
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: "Refresh token required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await findUserByUsername(decoded.username);
    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    // ✅ CRITICAL: Validate refresh token district matches DB
    if (decoded.districtId !== user.districtId) {
      console.error(`🚨 REFRESH BYPASS: Token for district ${decoded.districtId}, user is in ${user.districtId}`);
      return res.status(401).json({ success: false, error: "Invalid refresh token" });
    }

    // ✅ Validate token version
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ success: false, error: "Refresh token expired" });
    }

    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
      districtId: user.districtId, // Always from DB
      tokenVersion: user.tokenVersion,
    });

    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" as const : "lax" as const, // ✅ lax for localhost
      path: "/",
    };

    // Set new access token cookie
    res.cookie("accessToken", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token as httpOnly cookie (7 days)
    res.cookie("refreshToken", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: normalizeRole(user.role),
          districtId: user.districtId
        }
      }
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(401).json({ success: false, error: "Invalid refresh token" });
  }
});

router.get("/verify", optionalAuth, async (req: any, res) => {
  try {
    if (!req.user) {
      // ✅ PUBLIC MODE: no auth but not error
      return res.json({
        success: true,
        user: null,
      });
    }

    console.log("✅ [VERIFY] Auth middleware passed, req.user:", req.user);
    const user = await findUserByUsername(req.user.username);
    console.log("✅ [VERIFY] DB user lookup result:", user ? "FOUND" : "NOT FOUND");
    if (!user || user.tokenVersion !== req.user.tokenVersion) {
      console.log("❌ [VERIFY] Token version mismatch or user not found");
      return res.json({
        success: true,
        user: null,
      });
    }
    console.log("✅ [VERIFY] Verification successful, returning user data");
    return res.json({
      success: true,
      user: {
        id: req.user.userId,
        username: req.user.username,
        role: req.user.role,
        isAdmin: req.user.isAdmin,
        districtId: req.user.districtId,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

export default router;

// ========== USER WALLET & TRANSACTIONS ==========
router.get("/balance", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.ctx?.userId!;
    
    const user = await findUserById(userId, { wallet: true, walletCredit: true, totalSpent: true });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const availableBalance = (user.wallet || 0) + (user.walletCredit || 0);

    return res.json({
      success: true,
      data: {
        wallet: user.wallet || 0,
        walletCredit: user.walletCredit || 0,
        totalSpent: user.totalSpent || 0,
        availableBalance
      }
    });
  } catch (error) {
    console.error("Balance error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch balance" });
  }
});

router.get("/transactions", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.ctx?.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      findTransactionsByUserId(userId, { orderBy: { createdAt: "desc" }, take: limit, skip }),
      countTransactionsByUserId(userId)
    ]);

    return res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error("Transactions error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch transactions" });
  }
});