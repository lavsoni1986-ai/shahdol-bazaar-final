import { prisma } from "../storage";
import { baseSlug, appendSuffix } from "../utils/slug";

export async function findProductsByCategory(category: string, districtId: number) {
  const vendors = await prisma.vendor.findMany({
    where: { category: category as any, districtId, status: "APPROVED" },
    select: { id: true }
  });
  const vendorIds = vendors.map(v => v.id);
  if (!vendorIds.length) return [];

  return prisma.product.findMany({
    where: {
      vendorId: { in: vendorIds },
      approved: true,
      status: { in: ["APPROVED", "approved", "ACTIVE", "active"] }
    },
    include: {
      vendor: {
        select: { id: true, name: true, slug: true, dsslScore: true }
      },
      images: true
    }
  });
}

export async function findActiveProductsByDistrict(districtId: number, limit: number = 20) {
  return prisma.product.findMany({
    where: {
      districtId,
      approved: true,
      status: { in: ["APPROVED", "approved", "ACTIVE", "active"] }
    },
    include: {
      vendor: { select: { name: true, slug: true, dsslScore: true } },
      images: true
    },
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
}

export async function findProductBySlug(slug: string, districtId: number) {
  return prisma.product.findFirst({
    where: {
      slug,
      districtId,
      approved: true,
      status: { in: ["APPROVED", "approved", "ACTIVE", "active"] }
    },
    include: {
      vendor: true,
      images: true
    }
  });
}

export async function findProductsByVendor(vendorId: number) {
  return prisma.product.findMany({
    where: {
      vendorId,
      approved: true,
      status: { in: ["APPROVED", "approved", "ACTIVE", "active"] }
    },
    include: {
      vendor: { select: { id: true, name: true, slug: true, dsslScore: true } },
      images: true
    }
  });
}

export async function findProductById(productId: number) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      approved: true,
      status: { in: ["APPROVED", "approved", "ACTIVE", "active"] }
    },
    include: {
      vendor: {
        select: {
          id: true, name: true, slug: true, logo: true,
          address: true, phone: true, rating: true
        }
      },
      images: true
    }
  });
}

export async function searchProductsByName(keyword: string, districtId: number, limit: number = 20) {
  return prisma.product.findMany({
    where: {
      districtId,
      approved: true,
      status: { in: ["APPROVED", "approved", "ACTIVE", "active"] },
      OR: [
        { title: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } }
      ]
    },
    include: {
      vendor: { select: { name: true, slug: true, dsslScore: true } },
      images: true
    },
    take: limit
  });
}

export async function countProductsByVendor(vendorId: number) {
  return prisma.product.count({
    where: {
      vendorId,
      approved: true,
      status: { in: ["APPROVED", "approved", "ACTIVE", "active"] }
    }
  });
}

export async function countActiveProductsByDistrict(districtId: number) {
  const vendors = await prisma.vendor.findMany({
    where: { districtId, status: "APPROVED" },
    select: { id: true }
  });
  const vendorIds = vendors.map(v => v.id);
  return prisma.product.count({
    where: { vendorId: { in: vendorIds }, approved: true, status: { in: ["APPROVED", "approved", "ACTIVE", "active"] } }
  });
}

export async function findProductByIdInTx(tx: any, id: number) {
  return tx.product.findUnique({ where: { id } });
}

export async function updateProductInTx(tx: any, id: number, data: any) {
  return tx.product.update({ where: { id }, data });
}

export async function aggregateProductInTx(tx: any, where: any, _avg: any) {
  return tx.product.aggregate({ where, _avg });
}

export async function findMerchantProductsByVendor(vendorId: number) {
  return prisma.product.findMany({
    where: { vendorId },
    include: {
      images: true,
      vendor: { select: { id: true, name: true, slug: true, dsslScore: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function findMerchantProductById(productId: number, vendorId: number) {
  return prisma.product.findFirst({
    where: { id: productId, vendorId },
    include: { images: true }
  });
}

export async function generateUniqueProductSlug(title: string): Promise<string> {
  const base = baseSlug(title);
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.product.findFirst({
      where: { slug }
    });
    if (!existing) {
      break;
    }
    counter++;
    slug = appendSuffix(base, counter);
  }
  return slug;
}

export async function createMerchantProduct(data: any) {
  if (!data.slug && (data.title || data.name)) {
    data.slug = await generateUniqueProductSlug(data.title || data.name);
  }
  return prisma.product.create({ data });
}

export async function updateMerchantProduct(productId: number, vendorId: number, data: any) {
  return prisma.product.updateMany({
    where: { id: productId, vendorId },
    data
  });
}

export async function deleteMerchantProduct(productId: number, vendorId: number) {
  return prisma.product.deleteMany({
    where: { id: productId, vendorId }
  });
}

export async function createMerchantProductImage(productId: number, url: string) {
  return prisma.productImage.create({
    data: { productId, url }
  });
}

export async function deleteMerchantProductImage(imageId: number, productId: number) {
  return prisma.productImage.deleteMany({
    where: { id: imageId, productId }
  });
}

export async function getMerchantProductImages(productId: number) {
  return prisma.productImage.findMany({
    where: { productId }
  });
}
