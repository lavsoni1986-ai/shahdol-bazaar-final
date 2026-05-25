import { prisma } from "../storage";
import { VendorStatus } from "@prisma/client";
import { buildVendorSearchText } from "../../shared/cognition/entity-search-indexing";

export const PUBLIC_VENDOR_WHERE = {
  status: VendorStatus.APPROVED,
  isShadowBanned: false,
};

export async function findVendorsByCategory(category: string, districtId: number) {
  return prisma.vendor.findMany({
    where: {
      ...PUBLIC_VENDOR_WHERE,
      category: category as any,
      districtId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      businessType: true,
      districtId: true,
      logo: true,
      rating: true,
      dsslScore: true,
      isVerified: true,
      boostedUntil: true,
    },
  });
}

export async function findVendorsByIds(ids: number[]) {
  if (!ids.length) return [];

  return prisma.vendor.findMany({
    where: {
      id: { in: ids },
      ...PUBLIC_VENDOR_WHERE,
    },
  });
}

export async function findVendorBySlug(slug: string, districtId?: number, category?: string) {
  const where: any = {
    slug,
    ...PUBLIC_VENDOR_WHERE,
  };

  if (districtId !== undefined) where.districtId = districtId;
  if (category) where.category = category;

  return prisma.vendor.findFirst({
    where,
    include: {
      products: {
        where: {
          approved: true,
          status: { in: ["APPROVED", "approved", "ACTIVE", "active"] },
        },
        include: {
          images: true,
        },
      },
    },
  });
}

export async function countVendorsByDistrict(districtId: number) {
  return prisma.vendor.count({
    where: {
      districtId,
      ...PUBLIC_VENDOR_WHERE,
    },
  });
}

export async function findVendorsByDistrict(districtId: number) {
  return prisma.vendor.findMany({
    where: {
      districtId,
      ...PUBLIC_VENDOR_WHERE,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      businessType: true,
      logo: true,
      rating: true,
      dsslScore: true,
      isVerified: true,
      boostedUntil: true,
    },
  });
}

export async function findStoresByDistrict(districtId: number) {
  return findVendorsByDistrict(districtId);
}

export async function findVendorById(id: number) {
  return prisma.vendor.findFirst({
    where: {
      id,
      ...PUBLIC_VENDOR_WHERE,
    },
  });
}

export async function updateVendor(id: number, data: any) {
  // If updating fields that affect search, rebuild searchText
  const searchRelevantFields = ['name', 'category', 'businessType', 'type', 'description', 'address', 'locality', 'landmark', 'districtSlug'];

  if (Object.keys(data).some(key => searchRelevantFields.includes(key))) {
    // Get current vendor data for complete search text building
    const currentVendor = await prisma.vendor.findUnique({
      where: { id },
      select: {
        name: true,
        category: true,
        businessType: true,
        description: true,
        address: true
      }
    });

    if (currentVendor) {
      // Merge current data with updates for complete search text
      const completeData = { ...currentVendor, ...data };
      data.searchText = buildVendorSearchText(completeData);
    }
  }

  return prisma.vendor.update({
    where: { id },
    data,
  });
}

export async function countVendors(where: any) {
  return prisma.vendor.count({ where });
}

export async function countVendorsByCategory(category: string, districtId: number) {
  return prisma.vendor.count({
    where: {
      districtId,
      category: category as any,
      ...PUBLIC_VENDOR_WHERE,
    },
  });
}

/**
 * SOVEREIGN MERCHANT RESOLVER
 * Transitional merchant user -> vendor mapping until ownerUserId FK exists.
 */
export async function findVendorByOwnerUserId(ownerUserId: number, districtId?: number) {
  const user = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: {
      id: true,
      username: true,
      districtId: true,
      shopName: true,
    },
  });

  if (!user) return null;

  const effectiveDistrictId = districtId || user.districtId;
  if (!effectiveDistrictId) return null;

  // Priority 1: exact vendor.slug === user.username
  let vendor = await prisma.vendor.findFirst({
    where: {
      slug: user.username || "__none__",
      districtId: effectiveDistrictId,
    },
  });

  if (vendor) return vendor;

  // Priority 2: vendor.name loosely matches user.shopName
  if (user.shopName) {
    vendor = await prisma.vendor.findFirst({
      where: {
        name: {
          contains: user.shopName,
          mode: "insensitive",
        },
        districtId: effectiveDistrictId,
      },
    });

    if (vendor) return vendor;
  }

  return null;
}

import { Prisma } from '@prisma/client';

export async function resolveMerchantVendorOrThrow(ownerUserId: number, districtId?: number) {
  // Try to resolve existing vendor linkage
  let vendor = await findVendorByOwnerUserId(ownerUserId, districtId);

  if (vendor) return vendor;

  // If not found, attempt safe, idempotent auto-provisioning for merchants
  try {
    console.log(`🔧 [MERCHANT_VENDOR_LINK] No vendor linked for user=${ownerUserId}, district=${districtId || 'auto'} — attempting auto-provision`);

    const user = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { id: true, username: true, shopName: true, districtId: true } });
    if (!user) throw new Error('MERCHANT_VENDOR_NOT_LINKED');

    const effectiveDistrictId = districtId || user.districtId;
    if (!effectiveDistrictId) throw new Error('MERCHANT_VENDOR_NOT_LINKED');

    const rawSlug = String(user.username || `merchant-${user.id}`).trim().toLowerCase();
    const slug = rawSlug.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const vendorData: any = {
      name: String(user.shopName || user.username).trim(),
      slug,
      status: 'PENDING',
      isShadowBanned: false,
      category: 'SERVICE',

      description: user.shopName ? `${user.shopName} — auto-provisioned` : null,
      district: { connect: { id: effectiveDistrictId } },
      userId: user.id
    };

    try {
      vendor = await prisma.vendor.create({ data: vendorData });
      console.log(`✅ [VENDOR AUTO-PROVISION] Created vendor id=${vendor.id} slug=${vendor.slug} user=${ownerUserId} district=${effectiveDistrictId}`);
      return vendor;
    } catch (err: any) {
      // Handle unique constraint races — try to find existing vendor again
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.warn('⚠️ [VENDOR PROVISION RACE] Unique constraint, finding existing vendor');
        const existing = await prisma.vendor.findFirst({ where: { slug, districtId: effectiveDistrictId } });
        if (existing) return existing;
      }
      console.error('⚠️ [VENDOR PROVISION FAILED]', err?.message || err);
      throw new Error('MERCHANT_VENDOR_NOT_LINKED');
    }
  } catch (e: any) {
    // Final failure: maintain original contract by throwing the sentinel error
    throw new Error('MERCHANT_VENDOR_NOT_LINKED');
  }
}
