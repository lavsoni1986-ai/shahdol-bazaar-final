import { prisma } from "../storage";

export async function findReview(where: any) {
  return prisma.review.findFirst({ where });
}

export async function countReviews(where: any) {
  return prisma.review.count({ where });
}

export async function aggregateReview(where: any, _count: any) {
  return prisma.review.aggregate({ where, _count });
}

export async function findReviews(where: any, options?: { orderBy?: any; take?: number }) {
  return prisma.review.findMany({
    where,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take })
  });
}

export async function createReview(data: any) {
  return prisma.review.create({ data });
}
