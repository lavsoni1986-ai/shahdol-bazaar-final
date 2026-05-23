import { prisma } from "../storage";

export async function findDSSLHistory(where: any, options?: { orderBy?: any }) {
  return prisma.dSSLHistory.findMany({
    where,
    ...(options?.orderBy && { orderBy: options.orderBy })
  });
}

export async function createDSSLHistory(data: any) {
  return prisma.dSSLHistory.create({ data });
}

export async function findVendorMLProfile(where: any) {
  return prisma.vendorMLProfile.findUnique({ where });
}

export async function updateVendorMLProfile(where: any, data: any) {
  return prisma.vendorMLProfile.update({ where, data });
}
