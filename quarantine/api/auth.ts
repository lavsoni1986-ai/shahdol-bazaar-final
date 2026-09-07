import { createBaseApp, errorHandler } from "./bootstrap";
import authRoutes from "../server/routes/auth.routes";

const app = createBaseApp();

// Mount authentication and user routes
app.use("/api/auth", authRoutes);
app.use("/api/user", authRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
