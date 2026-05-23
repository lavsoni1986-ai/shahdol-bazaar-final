import { SystemLockdown } from "../services/system.health";

export const lockdownMiddleware = (req: any, res: any, next: any) => {
  const path = req.originalUrl;

  // Allow these always
  if (
    path.startsWith("/api/auth") ||
    path.startsWith("/api/admin") ||
    path.startsWith("/api/health")
  ) {
    return next();
  }

  if (SystemLockdown.isLocked()) {
    return res.status(503).json({
      success: false,
      error: "System is under maintenance",
    });
  }

  next();
};