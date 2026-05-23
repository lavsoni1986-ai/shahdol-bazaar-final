// server/routes/transit.routes.ts
// Sovereign district-scoped transit route API

import { Router, type Request, type Response } from "express";
import { prisma } from "../storage";
import { success, failure } from "../lib/apiResponse";

const router = Router();

// GET /api/bus-timetable — district-scoped bus route listing
router.get("/bus-timetable", async (req: any, res: Response) => {
    try {
        const districtId = req.ctx?.districtId || req.districtId || 1;

        const routes = await prisma.busTimetable.findMany({
            where: {
                districtId,
                isActive: true,
            },
            orderBy: { fromCity: "asc" },
        });

        return success(res, routes);
    } catch (err) {
        console.error("❌ [TRANSIT] Error fetching bus timetable:", err);
        return failure(res, "SERVER_ERROR", "Failed to fetch bus timetable", 500);
    }
});

// GET /api/bus-timetable/:id — single bus route detail
router.get("/bus-timetable/:id", async (req: any, res: Response) => {
    try {
        const districtId = req.ctx?.districtId || req.districtId || 1;
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return failure(res, "INVALID_ID", "Invalid bus route ID", 400);
        }

        const route = await prisma.busTimetable.findFirst({
            where: {
                id,
                districtId,
                isActive: true,
            },
        });

        if (!route) {
            return failure(res, "NOT_FOUND", "Bus route not found", 404);
        }

        return success(res, route);
    } catch (err) {
        console.error("❌ [TRANSIT] Error fetching bus route:", err);
        return failure(res, "SERVER_ERROR", "Failed to fetch bus route", 500);
    }
});

export default router;
