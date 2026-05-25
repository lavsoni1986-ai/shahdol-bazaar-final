import { prisma } from '../storage.js';

export async function trackCallVendor(params: {
  userId?: number;
  vendorId: number;
  query: string;
  districtId: number;
  sessionId?: string;
  actionType?: string;
}) {
  try {
    await prisma.userEvent.create({
      data: {
        userId: params.userId ?? 0,
        eventType: "CALL_VENDOR",
        districtId: params.districtId,
        sessionId: params.sessionId || null,
        eventData: {
          vendorId: params.vendorId,
          query: params.query,
          actionType: params.actionType || "CALL_VENDOR",
        },
      },
    });

    console.log("TELEMETRY_SUCCESS", {
      eventType: "CALL_VENDOR",
      vendorId: params.vendorId,
    });
  } catch (error) {
    console.error("TELEMETRY_ERROR", {
      eventType: "CALL_VENDOR",
      vendorId: params.vendorId,
      error: (error as any).message,
    });
  }
}

export async function trackWhatsappVendor(params: {
  userId?: number;
  vendorId: number;
  query: string;
  districtId: number;
  sessionId?: string;
  actionType?: string;
}) {
  try {
    await prisma.userEvent.create({
      data: {
        userId: params.userId ?? 0,
        eventType: "WHATSAPP_VENDOR",
        districtId: params.districtId,
        sessionId: params.sessionId || null,
        eventData: {
          vendorId: params.vendorId,
          query: params.query,
          actionType: params.actionType || "WHATSAPP_VENDOR",
        },
      },
    });

    console.log("TELEMETRY_SUCCESS", {
      eventType: "WHATSAPP_VENDOR",
      vendorId: params.vendorId,
    });
  } catch (error) {
    console.error("TELEMETRY_ERROR", {
      eventType: "WHATSAPP_VENDOR",
      vendorId: params.vendorId,
      error: (error as any).message,
    });
  }
}

export async function trackOpenMaps(params: {
  userId?: number;
  vendorId: number;
  query: string;
  districtId: number;
  sessionId?: string;
  actionType?: string;
}) {
  try {
    await prisma.userEvent.create({
      data: {
        userId: params.userId ?? 0,
        eventType: "OPEN_MAPS",
        districtId: params.districtId,
        sessionId: params.sessionId || null,
        eventData: {
          vendorId: params.vendorId,
          query: params.query,
          actionType: params.actionType || "OPEN_MAPS",
        },
      },
    });

    console.log("TELEMETRY_SUCCESS", {
      eventType: "OPEN_MAPS",
      vendorId: params.vendorId,
    });
  } catch (error) {
    console.error("TELEMETRY_ERROR", {
      eventType: "OPEN_MAPS",
      vendorId: params.vendorId,
      error: (error as any).message,
    });
  }
}

export async function trackBookingIntent(params: {
  userId?: number;
  vendorId: number;
  query: string;
  districtId: number;
  sessionId?: string;
  actionType?: string;
}) {
  try {
    await prisma.userEvent.create({
      data: {
        userId: params.userId ?? 0,
        eventType: "BOOK_VENDOR",
        districtId: params.districtId,
        sessionId: params.sessionId || null,
        eventData: {
          vendorId: params.vendorId,
          query: params.query,
          actionType: params.actionType || "BOOK_VENDOR",
        },
      },
    });

    console.log("TELEMETRY_SUCCESS", {
      eventType: "BOOK_VENDOR",
      vendorId: params.vendorId,
    });
  } catch (error) {
    console.error("TELEMETRY_ERROR", {
      eventType: "BOOK_VENDOR",
      vendorId: params.vendorId,
      error: (error as any).message,
    });
  }
}