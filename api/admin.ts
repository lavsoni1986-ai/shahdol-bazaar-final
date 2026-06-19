import { createBaseApp, errorHandler } from "./bootstrap";
import adminRoutes from "../server/routes/admin/index";
import adminDsslRoutes from "../server/routes/admin/dssl";

const app = createBaseApp();

// Mount admin and admin/dssl endpoints
app.use("/api/admin", adminRoutes);
app.use("/api/admin/dssl", adminDsslRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
