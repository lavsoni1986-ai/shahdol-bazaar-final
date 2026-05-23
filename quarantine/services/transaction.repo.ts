import { prisma } from "../storage";

export async function withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx);
  });
}

export async function createTransactionInTx(tx: any, data: any) {
  return tx.transaction.create({ data });
}

export async function updateUserInTx(tx: any, id: number, data: any) {
  return tx.user.update({ where: { id }, data });
}

export async function updateVendorInTx(tx: any, id: number, data: any) {
  return tx.vendor.update({ where: { id }, data });
}

export async function findUserByIdInTx(tx: any, id: number) {
  return tx.user.findUnique({ where: { id } });
}

export async function findVendorByIdInTx(tx: any, id: number) {
  return tx.vendor.findFirst({ where: { id } });
}

export async function findProductByIdInTx(tx: any, id: number) {
  return tx.product.findUnique({ where: { id } });
}

export async function updateProductInTx(tx: any, id: number, data: any) {
  return tx.product.update({ where: { id }, data });
}

export async function createAuditLogInTx(tx: any, data: any) {
  return tx.auditLog.create({ data });
}

export async function findTransactionsByUserId(userId: number, queryOptions: any = {}) {
  return prisma.transaction.findMany({
    where: { userId },
    ...queryOptions,
  });
}

export async function countTransactionsByUserId(userId: number) {
  return prisma.transaction.count({
    where: { userId }
  });
}
