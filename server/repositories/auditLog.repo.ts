import { prisma } from "../storage";

export async function findAuditLog(where: any) {
  return prisma.auditLog.findFirst({ where });
}

export async function createAuditLog(data: any) {
  return prisma.auditLog.create({ data });
}

export async function findAuditLogs(where: any, options?: { orderBy?: any; take?: number }) {
  return prisma.auditLog.findMany({
    where,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take })
  });
}
