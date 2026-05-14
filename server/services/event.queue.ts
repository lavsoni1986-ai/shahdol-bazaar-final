// 🔥 EVENT QUEUE (Performance Scaling)
// Simple in-memory queue, ready for Redis/BullMQ upgrade

import { createUserEvent } from "../repositories/userEvent.repo";

interface QueuedEvent {
  id: string;
  payload: any;
  timestamp: number;
  retries: number;
}

class EventQueue {
  private queue: QueuedEvent[] = [];
  private processing = false;
  private readonly MAX_QUEUE_SIZE = 10000;
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 10;

  async add(type: string, payload: any): Promise<void> {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('⚠️ Event queue full, dropping event');
      return;
    }

    const event: QueuedEvent = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payload: { ...payload, type },
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(event);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    try {
      // Process in batches
      const batch = this.queue.splice(0, this.BATCH_SIZE);

      for (const event of batch) {
        try {
          await this.processEvent(event);
        } catch (error) {
          console.error(`Failed to process event ${event.id}:`, error);
          event.retries++;

          if (event.retries < this.MAX_RETRIES) {
            // Re-queue for retry
            this.queue.unshift(event);
          }
        }
      }
    } finally {
      this.processing = false;

      // Continue processing if more events
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100); // Small delay to prevent tight loop
      }
    }
  }

  private async processEvent(event: QueuedEvent): Promise<void> {
    const { type, ...payload } = event.payload;

    switch (type) {
      case 'user_event':
          await createUserEvent(payload);
        break;

      default:
        console.warn(`Unknown event type: ${type}`);
    }
  }

  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      maxSize: this.MAX_QUEUE_SIZE
    };
  }
}

// Global event queue instance
export const eventQueue = new EventQueue();
