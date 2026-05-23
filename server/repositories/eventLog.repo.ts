import { prisma } from "../storage";

export async function findEventLog(where: any) {
  return prisma.eventLog.findFirst({ where });
}

export async function createEventLog(data: any) {
  return prisma.eventLog.create({ data });
}

export async function findEventLogs(where: any, options?: { orderBy?: any; take?: number }) {
  return prisma.eventLog.findMany({
    where,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take })
  });
}
