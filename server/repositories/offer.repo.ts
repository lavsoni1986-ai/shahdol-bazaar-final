import { prisma } from "../storage";

export async function findActiveOffersByDistrict(districtId: number) {
  return prisma.offer.findMany({
    where: { districtId, isActive: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function deleteOfferById(offerId: number) {
  return prisma.offer.delete({
    where: { id: offerId }
  });
}