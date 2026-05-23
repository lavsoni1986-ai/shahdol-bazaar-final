declare module "@socket.io/redis-adapter" {
  export function createAdapter(pubClient: unknown, subClient: unknown): any;
}

declare module "ioredis" {
  export default class Redis {
    constructor(url?: string, options?: Record<string, unknown>);
    connect(): Promise<void>;
  }
}
