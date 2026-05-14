import { Server as HTTPServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { findUserById } from "./repositories/user.repo";

let io: SocketServer;
let redisAdapter: any = null;

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_HOST || "redis://localhost:6379";

async function createRedisAdapter(): Promise<any> {
  // Redis adapter is optional - will fallback gracefully
  try {
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const Redis = (await import("ioredis")).default;

    const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_HOST || "redis://localhost:6379";

    const pubClient = new Redis(REDIS_URL, { 
      lazy: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 50, 2000)
    });
    
    const subClient = new Redis(REDIS_URL, { 
      lazy: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 50, 2000)
    });

    await pubClient.connect();
    await subClient.connect();

    const adapter = createAdapter(pubClient, subClient);
    console.log("✅ [REDIS] Socket.io adapter connected");
    return adapter;
  } catch (error) {
    console.warn("⚠️ [SCALE] Redis adapter unavailable - running single-instance mode");
    return null;
  }
}

export let healthCache: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10000;

export async function initRealtime(httpServer: HTTPServer): Promise<SocketServer> {
  // Try to create Redis adapter
  const adapter = await createRedisAdapter();

  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  // Apply Redis adapter if available
  if (adapter) {
    io.adapter(adapter);
    console.log("✅ [SCALE] Redis adapter applied - horizontal scaling enabled");
  } else {
    console.warn("⚠️ [SCALE] Running in single-instance mode");
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await findUserById(decoded.userId, { id: true, role: true, districtId: true });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      (socket as any).user = user;
      next();
    } catch (error) {
      return next(new Error(`Authentication error: ${(error as Error).message}`));
    }
  });

  // Connection handling
  io.on("connection", (socket) => {
    const user = (socket as any).user;
    console.log(`🔗 Admin connected: ${user.role} (${user.id})`);

    socket.on("join:district", (districtId: number) => {
      if (user.role === "SUPER_ADMIN" || user.districtId === districtId) {
        socket.join(`district:${districtId}`);
        console.log(`📍 Admin ${user.id} joined district:${districtId}`);
      } else {
        socket.emit("error", { message: "Unauthorized: Cannot join this district" });
      }
    });

    if (user.role === "SUPER_ADMIN") {
      socket.join("system:alerts");
      console.log(`🚨 Super admin ${user.id} joined system alerts`);
    }

    socket.on("disconnect", () => {
      console.log(`🔌 Admin disconnected: ${user.id}`);
    });
  });

  return io;
}