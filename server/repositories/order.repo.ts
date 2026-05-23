import { prisma } from "../storage";

export async function findOrderById(id: number) {
  return prisma.order.findUnique({
    where: { id }
  });
}

export async function createOrder(data: any) {
  return prisma.order.create({
    data
  });
}

export async function updateOrder(id: number, data: any) {
  return prisma.order.update({
    where: { id },
    data
  });
}

export async function countOrders(where: any) {
  return prisma.order.count({ where });
}

export async function aggregateOrders(where: any, _sum: any) {
  return prisma.order.aggregate({ where, _sum });
}

export async function findOrders(where: any, options?: { orderBy?: any; take?: number; include?: any }) {
  return prisma.order.findMany({
    where,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take }),
    ...(options?.include && { include: options.include })
  });
}
