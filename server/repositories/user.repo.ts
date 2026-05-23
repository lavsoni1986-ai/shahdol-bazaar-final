import { prisma } from "../storage";

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username }
  });
}

export async function findUserById(id: number, select?: any) {
  return prisma.user.findUnique({
    where: { id },
    ...(select && { select })
  });
}

export async function updateUser(id: number, data: any) {
  return prisma.user.update({
    where: { id },
    data
  });
}

export async function countUsers(where: any) {
  return prisma.user.count({ where });
}

export async function createUser(data: any) {
  // Adapt to Prisma relational district model when districtId provided
  const payload = {
    ...data,
    district: data.districtId ? { connect: { id: data.districtId } } : undefined
  } as any;
  // Remove raw districtId if present to avoid Prisma errors
  delete payload.districtId;
  return prisma.user.create({ data: payload });
}
