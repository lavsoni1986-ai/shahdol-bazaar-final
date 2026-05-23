import express, { type Request, type Response } from "express";
import { hashPassword, verifyPassword } from "../auth/password";
import { generateTokenPair, verifyRefreshToken } from "../auth/jwt";
import { loginDTO, registerDTO, refreshTokenDTO } from "../dto/auth.dto";
import { normalizeRole } from "../../shared/roles";
import { registerLimiter, loginLimiter } from "../auth/rateLimiter";
import { requireAuth, optionalAuth } from "../auth/middleware";
import { findUserByUsername, findUserById, updateUser, createUser } from "../repositories/user.repo";
import { findDistrictBySlug } from "../repositories/district.repo";
// import { findTransactionsByUserId, countTransactionsByUserId } from "../repositories/transaction.repo";
import crypto from "crypto";
import { prisma } from "../storage";

const router = express.Router();

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    console.log("[LOGIN] request received");

    const parsed = loginDTO.safeParse(req.body);
    if (!parsed.success) {
      console.error("[LOGIN ERROR] DTO validation failed", parsed.error);
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    const { username, password } = parsed.data;

    console.log("[LOGIN] username received:", username);
    const user = await findUserByUsername(username);
    console.log("[LOGIN] user found:", !!user);

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    console.log("[LOGIN] role:", user.role);
    console.log("[LOGIN] password compare start");
    const isPasswordValid = verifyPassword(password, user.password);
    console.log("[LOGIN] password compare success:", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // 🔐 Generate tokens with current version
    console.log("[LOGIN] generating tokens");
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
      districtId: user.districtId,
      tokenVersion: 1,
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
    console.log("[LOGIN] sending response");
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
  } catch (error: unknown) {
    console.error("[LOGIN ERROR]", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/register", registerLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, role, phone, shopName, shopAddress } = registerDTO.parse(req.body);

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

    const inferredRole =
      shopName || shopAddress || phone
        ? "merchant"
        : role;

    const finalRole = normalizeRole(inferredRole || "customer");

    console.log("🛡️ [REGISTER ROLE AUDIT]", {
      incomingRole: role,
      inferredRole,
      finalRole,
      username
    });

    const user = await createUser({
      username,
      password: hashedPassword,
      role: finalRole,
      districtId: district.id,
      shopName: shopName || null,
      shopAddress: shopAddress || null
    });

    // 🔧 M-3 — AUTO VENDOR PROVISION FOR MERCHANTS
if (finalRole === "MERCHANT") {
      try {
        console.log(`🔧 [VENDOR PROVISION START] user=${user.id} slug=${String(username).trim()} district=${district.id}`);
        await prisma.vendor.create({
          data: {
            name: String(shopName || username).trim(),
            slug: String(username).trim(),
            district: { connect: { id: district.id } },
            user: { connect: { id: user.id } },
            status: "PENDING" as any,
            isShadowBanned: false,
            category: "SERVICE" as any,
            trustScore: 70,
            dsslScore: 70,
            phone: phone || null,
            address: shopAddress || null,
            description: shopName ? `${shopName} — auto-provisioned` : null
          }
        });
        console.log(`✅ [VENDOR AUTO-PROVISION] Created vendor slug=${String(username).trim()} district=${district.id} MERCHANT=${user.id}`);
      } catch (vendorErr: any) {
        console.error(`⚠️ [VENDOR PROVISION FAILED] user=${user.id} err=${vendorErr?.message}`);
        if (vendorErr?.message && vendorErr.message.includes('Unknown argument')) {
          console.error('⚠️ [PRISMA RELATION ERROR] Likely legacy scalar used for relation - vendor creation failed with relation syntax.');
        }
        // Non-blocking: still allow login; merchant can claim later
      }
    }

    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
      districtId: user.districtId,
      tokenVersion: 1,
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

router.post("/logout", async (req: any, res: Response) => {
  try {
    if (req.ctx?.userId) {
      await updateUser(req.ctx.userId, {
        tokenVersion: { increment: 1 },
      });
    }
  } catch (e) {
    console.warn("Logout tokenVersion increment skipped", e);
  }

  const isProd = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    path: "/",
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  return res.json({ success: true, data: {} });
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
    const dbTokenVersion =
      typeof (user as Record<string, unknown>)["tokenVersion"] === "number"
        ? ((user as Record<string, unknown>)["tokenVersion"] as number)
        : 1;
    if (typeof decoded.tokenVersion === "number" && decoded.tokenVersion !== dbTokenVersion) {
      return res.status(401).json({ success: false, error: "Refresh token expired" });
    }

    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
      districtId: user.districtId, // Always from DB
      tokenVersion: dbTokenVersion,
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
    console.log("[VERIFY] request received", {
      requestId: req.requestId || req?.ctx?.requestId,
      hasAccessTokenCookie: !!req.cookies?.accessToken,
      hasRefreshTokenCookie: !!req.cookies?.refreshToken,
    });
    if (!req.user) {
      // ✅ PUBLIC MODE: no auth but not error
      console.log("[VERIFY] no req.user; returning user=null");
      return res.json({
        success: true,
        user: null,
      });
    }

    console.log("✅ [VERIFY] Auth middleware passed, req.user:", req.user);
    const user = await findUserByUsername(req.user.username);
    console.log("✅ [VERIFY] DB user lookup result:", user ? "FOUND" : "NOT FOUND");
    const verifyDbTokenVersion =
      user && typeof (user as Record<string, unknown>)["tokenVersion"] === "number"
        ? ((user as Record<string, unknown>)["tokenVersion"] as number)
        : 1;
    const verifyReqTokenVersion = typeof req.user.tokenVersion === "number" ? req.user.tokenVersion : 1;
    if (!user || verifyDbTokenVersion !== verifyReqTokenVersion) {
      console.log("❌ [VERIFY] Token version mismatch or user not found");
      return res.json({
        success: true,
        user: null,
      });
    }
    console.log("✅ [VERIFY] Verification successful, returning user data");
    return res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          username: req.user.username,
          role: req.user.role,
          isAdmin: req.user.isAdmin,
          districtId: req.user.districtId,
        }
      },
      user: {
        id: req.user.userId,
        username: req.user.username,
        role: req.user.role,
        isAdmin: req.user.isAdmin,
        districtId: req.user.districtId,
      }
    });
  } catch (err) {
    console.error("[VERIFY ERROR]", err);
    return res.status(500).json({ success: false });
  }
});

export default router;

// ========== USER WALLET & TRANSACTIONS ==========
router.get("/balance", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.ctx?.userId!;
    
    // Fetch minimal user record; wallet fields moved to dedicated financial tables. Provide graceful defaults.
    const user = await findUserById(userId, { id: true, username: true, districtId: true });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Wallet fields are in separate financial system. Return safe defaults for now.
    const wallet = 0;
    const walletCredit = 0;
    const totalSpent = 0;
    const availableBalance = wallet + walletCredit;

    // Log when falling back to defaults for observability
    console.log(`🔍 [BALANCE] Financial fields not present on User; returning fallback for user=${userId}`);

    return res.json({
      success: true,
      data: {
        wallet,
        walletCredit,
        totalSpent,
        availableBalance
      }
    });
  } catch (error) {
    console.error("Balance error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch balance" });
  }
});

// router.get("/transactions", requireAuth, async (req: any, res: Response) => {
//   try {
//     const userId = req.ctx?.userId!;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const skip = (page - 1) * limit;

//     const [transactions, total] = await Promise.all([
//       findTransactionsByUserId(userId, { orderBy: { createdAt: "desc" }, take: limit, skip }),
//       countTransactionsByUserId(userId)
//     ]);

//     return res.json({
//       success: true,
//       data: {
//         transactions,
//         pagination: {
//           page,
//           limit,
//           total,
//           pages: Math.ceil(total / limit)
//         }
//       }
//     });
//   } catch (error) {
//     console.error("Transactions error:", error);
//     return res.status(500).json({ success: false, error: "Failed to fetch transactions" });
//   }
// });




