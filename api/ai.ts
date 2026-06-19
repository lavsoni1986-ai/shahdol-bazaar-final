import { createBaseApp, errorHandler } from "./bootstrap";
import aiRoutes from "../server/routes/ai/concierge.routes";
import dsslRoutes from "../server/routes/ai/dssl.engine";

const app = createBaseApp();

// Mount AI and DSSL engine endpoints
app.use("/api/ai", aiRoutes);
app.use("/api/ai", dsslRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
