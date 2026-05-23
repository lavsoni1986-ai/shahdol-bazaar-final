import { prisma } from "../storage";

export async function findUserEventById(id: number) {
  return prisma.userEvent.findUnique({ where: { id } });
}

export async function createUserEvent(data: any) {
  return prisma.userEvent.create({ data });
}

export async function findUserEvents(where: any, options?: { orderBy?: any; take?: number }) {
  return prisma.userEvent.findMany({
    where,
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take })
  });
}

export async function findRecentUserEvent(userId: number, eventType?: string) {
  const where: any = { userId };
  if (eventType) where.eventType = eventType;
  return prisma.userEvent.findFirst({
    where,
    orderBy: { createdAt: 'desc' }
  });
}
