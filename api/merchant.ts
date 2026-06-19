import { createBaseApp, errorHandler } from "./bootstrap";
import merchantRoutes from "../server/routes/marketplace/products.routes";
import uploadRoutes from "../server/routes/upload.routes";

const app = createBaseApp();

// Mount merchant product catalog routes and upload endpoints
app.use("/api", merchantRoutes);
app.use("/api/upload", uploadRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
