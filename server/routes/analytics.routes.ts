import { Router } from "express";
import { success, failure } from "../lib/apiResponse";
import { safeLogger } from "../lib/logging/safe-logger";
import { LogComponent } from "../lib/logging/structured-logger";

const router = Router();

router.post("/track", async (req, res) => {
    try {
        const { vendorId, eventType, source, action, value } = req.body;
        const districtId = req.ctx?.districtId;

        safeLogger.info(LogComponent.TELEMETRY, 'analytics_event_received', 'Analytics event received', {
            vendorId,
            eventType,
            source,
            action,
            districtId
        });

        // TODO: Store analytics event in database
        // await prisma.analyticsEvent.create({ ... })

        console.log("📊 Analytics:", { vendorId, eventType, source, action, districtId });

        return success(res, { message: "Event tracked successfully" });
    } catch (err) {
        console.error("Analytics error:", err);
        safeLogger.error(LogComponent.TELEMETRY, 'analytics_processing_failed', 'Failed to process analytics event', {}, err);
        return failure(res, "Failed to track analytics event", 500);
    }
});

export default router;
