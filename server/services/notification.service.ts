import { prisma } from "../storage";

export class NotificationService {
  private static instance: NotificationService;
  private readonly MAX_RETRIES = 3;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Queue a notification for asynchronous, non-blocking dispatch.
   */
  async queueNotification(params: {
    districtId: number;
    userId?: number | null;
    channel: "SMS" | "WHATSAPP" | "EMAIL" | "PUSH" | "INTERNAL";
    recipient: string;
    subject?: string;
    body: string;
  }): Promise<number> {
    // 1. Create persistent log in database
    const log = await prisma.notificationLog.create({
      data: {
        districtId: params.districtId,
        userId: params.userId || null,
        channel: params.channel,
        recipient: params.recipient,
        subject: params.subject || null,
        body: params.body,
        status: "PENDING",
        retryCount: 0
      }
    });

    // 2. Dispatch asynchronously (non-blocking)
    setImmediate(() => {
      this.dispatch(log.id).catch(err => {
        console.error(`❌ [NOTIFICATION] Async dispatch failed for log ID ${log.id}:`, err);
      });
    });

    return log.id;
  }

  /**
   * Internal worker to process dispatch and handle retries.
   */
  private async dispatch(logId: number): Promise<void> {
    const log = await prisma.notificationLog.findUnique({
      where: { id: logId }
    });

    if (!log || log.status === "SENT") return;

    try {
      // Simulated provider dispatch logic
      console.log(`📡 [NOTIFICATION DISPATCH] Channel: ${log.channel} | Recipient: ${log.recipient} | Body: "${log.body}"`);
      
      // Simulate network request success
      // If we need to integration test failures, we can check for special recipient templates.
      if (log.recipient.includes("simulate-fail")) {
        throw new Error("Simulated provider connection timeout");
      }

      // Update log to SENT
      await prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: "SENT",
          errorMessage: null
        }
      });

      console.log(`✅ [NOTIFICATION SUCCESS] Sent log ID ${logId}`);
    } catch (err: any) {
      const errorMsg = err.message || "Unknown error";
      const nextRetryCount = log.retryCount + 1;

      if (nextRetryCount <= this.MAX_RETRIES) {
        // Update database with pending retry state
        await prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: "PENDING",
            retryCount: nextRetryCount,
            errorMessage: errorMsg
          }
        });

        // Calculate exponential backoff (2^attempt * 1000ms)
        const delay = Math.pow(2, nextRetryCount) * 1000;
        console.warn(`⚠️ [NOTIFICATION RETRY] Queueing retry #${nextRetryCount} for log ID ${logId} in ${delay}ms...`);
        
        setTimeout(() => {
          this.dispatch(logId).catch(retryErr => {
            console.error(`❌ [NOTIFICATION RETRY FAIL] Error retrying log ID ${logId}:`, retryErr);
          });
        }, delay);
      } else {
        // Hard failure - no more retries
        await prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: "FAILED",
            errorMessage: `Failed after ${this.MAX_RETRIES} attempts. Last error: ${errorMsg}`
          }
        });
        console.error(`🚨 [NOTIFICATION FATAL] Dispatch failed permanently for log ID ${logId}`);
      }
    }
  }
}

export const notificationService = NotificationService.getInstance();
