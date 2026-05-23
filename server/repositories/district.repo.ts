import { prisma } from "../storage";

export async function findDistrictBySlug(slug: string) {
  return prisma.district.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" } }
  });
}

export async function findDistrictById(id: number) {
  return prisma.district.findUnique({
    where: { id }
  });
}

export async function findDistricts(where: any) {
  return prisma.district.findMany({ where });
}
