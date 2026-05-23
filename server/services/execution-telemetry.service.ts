import { prisma } from '../storage';


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
        userId: params.userId,
        eventType: "CALL_VENDOR",
        vendorId: params.vendorId,
        metadata: {
          query: params.query,
          districtId: params.districtId,
          sessionId: params.sessionId,
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
      error: error.message,
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
        userId: params.userId,
        eventType: "WHATSAPP_VENDOR",
        vendorId: params.vendorId,
        metadata: {
          query: params.query,
          districtId: params.districtId,
          sessionId: params.sessionId,
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
      error: error.message,
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
        userId: params.userId,
        eventType: "OPEN_MAPS",
        vendorId: params.vendorId,
        metadata: {
          query: params.query,
          districtId: params.districtId,
          sessionId: params.sessionId,
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
      error: error.message,
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
        userId: params.userId,
        eventType: "BOOK_VENDOR",
        vendorId: params.vendorId,
        metadata: {
          query: params.query,
          districtId: params.districtId,
          sessionId: params.sessionId,
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
      error: error.message,
    });
  }
}