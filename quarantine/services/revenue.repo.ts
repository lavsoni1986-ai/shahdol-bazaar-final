import { prisma } from "../storage";

export async function createTransaction(data: any) {
  return prisma.transaction.create({ data });
}

export async function aggregateTransactions(where: any, _sum: any) {
  return prisma.transaction.aggregate({ where, _sum });
}

export async function countTransactions(where: any) {
  return prisma.transaction.count({ where });
}

export async function findTransactions(where: any, options?: { orderBy?: any; take?: number }) {
  return prisma.transaction.findMany({
    where,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take })
  });
}

export async function findMerchantSubscription(where: any) {
  return prisma.merchantSubscription.findUnique({ where });
}

export async function upsertMerchantSubscription(where: any, create: any, update: any) {
  return prisma.merchantSubscription.upsert({ where, create, update });
}

export async function findDistricts(where: any) {
  return prisma.district.findMany({ where });
}

export async function createAdvertisement(data: any) {
  return prisma.advertisement.create({ data });
}

export async function findActiveAds(where: any, options?: { orderBy?: any; include?: any }) {
  return prisma.advertisement.findMany({
    where,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.include && { include: options.include })
  });
}

export async function updateAdvertisement(where: any, data: any) {
  return prisma.advertisement.update({ where, data });
}

export async function findAdSlots(where: any) {
  return prisma.adSlot.findMany({ where });
}

export async function updateAdSlot(where: any, data: any) {
  return prisma.adSlot.update({ where, data });
}

export async function createAdSlot(data: any) {
  return prisma.adSlot.create({ data });
}

export async function createMerchantSubscription(data: any) {
  return prisma.merchantSubscription.create({ data });
}

export async function groupTransactions(by: any, where: any, _sum: any, options?: { orderBy?: any; take?: number }) {
  return prisma.transaction.groupBy({
    by,
    where,
    _sum,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take })
  });
}

export async function groupMerchantTransactions(by: any, where: any, _sum: any, _count: any, options?: { orderBy?: any; take?: number }) {
  return prisma.transaction.groupBy({
    by,
    where,
    _sum,
    _count,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take })
  });
}
