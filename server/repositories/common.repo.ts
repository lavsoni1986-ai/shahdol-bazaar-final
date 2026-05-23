import { prisma } from "../storage";

export async function findProductById(id: number, select?: any) {
  return prisma.product.findUnique({
    where: { id },
    ...(select && { select })
  });
}

export async function updateProduct(id: number, data: any) {
  return prisma.product.update({
    where: { id },
    data
  });
}

export async function aggregateProduct(where: any, _avg: any) {
  return prisma.product.aggregate({ where, _avg });
}

export async function findVendorById(id: number, select?: any) {
  return prisma.vendor.findUnique({
    where: { id },
    ...(select && { select })
  });
}

export async function findCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug }
  });
}

export async function findCategories(where: any) {
  return prisma.category.findMany({ where });
}

export async function findAuditLog(where: any) {
  return prisma.auditLog.findFirst({ where });
}

export async function createAuditLog(data: any) {
  return prisma.auditLog.create({ data });
}
