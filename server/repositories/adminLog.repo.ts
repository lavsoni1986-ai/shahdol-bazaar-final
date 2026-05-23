import { prisma } from "../storage";

export async function findAdminLog(where: any) {
  return prisma.adminLog.findFirst({ where });
}

export async function createAdminLog(data: any) {
  return prisma.adminLog.create({ data });
}

export async function countAdminLogs(where: any) {
  return prisma.adminLog.count({ where });
}
