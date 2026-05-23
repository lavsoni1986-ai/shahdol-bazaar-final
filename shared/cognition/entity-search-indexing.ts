/**
 * ENTITY SEARCH INDEXING UTILITY
 *
 * Builds comprehensive searchText for entities using cognition taxonomy.
 * Automatically expands categories with semantic aliases and related terms.
 */

import { generateEntitySearchText } from './search-taxonomy.js';
import { getStorage } from '../storage-port';

/**
 * Builds search text for vendor entities
 * Includes name, category taxonomy, location, and business details
 */
export function buildVendorSearchText(vendor: {
  name: string;
  category: string;
  businessType?: string;
  type?: string;
  description?: string;
  address?: string;
  locality?: string;
  landmark?: string;
  districtId?: number;
}): string {
  // Combine all relevant text sources
  const name = vendor.name || '';
  const category = vendor.category || '';
  const location = [vendor.address, vendor.locality, vendor.landmark, vendor.districtId ? 'shahdol' : '']
    .filter(Boolean)
    .join(' ');
  const description = [vendor.businessType, vendor.type, vendor.description]
    .filter(Boolean)
    .join(' ');

  return generateEntitySearchText(name, category, location, description);
}

/**
 * Builds search text for product entities
 * Includes title, category taxonomy, and product attributes
 */
export function buildProductSearchText(product: {
  title: string;
  category: string;
  subCategory?: string;
  description?: string;
  tags?: string[];
  semanticKeywords?: string[];
  attributes?: any;
}): string {
  // Use the most specific category available
  const effectiveCategory = product.subCategory || product.category || '';

  // Combine description with tags and semantic keywords
  const descriptionParts = [
    product.description,
    ...(product.tags || []),
    ...(product.semanticKeywords || [])
  ].filter(Boolean);

  const description = descriptionParts.join(' ');

  return generateEntitySearchText(product.title, effectiveCategory, '', description);
}

/**
 * Updates vendor search text in database
 * Should be called after vendor creation or significant updates
 */
export async function updateVendorSearchText(vendorId: number): Promise<void> {
  const prisma = getStorage().prisma;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      category: true,
      businessType: true,
      type: true,
      description: true,
      address: true,
      locality: true,
      landmark: true,
      districtSlug: true
    }
  });

  if (!vendor) return;

  const searchText = buildVendorSearchText(vendor);

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { searchText }
  });
}

/**
 * Updates product search text in database
 * Should be called after product creation or significant updates
 */
export async function updateProductSearchText(productId: number): Promise<void> {
  const prisma = getStorage().prisma;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      category: true,
      subCategory: true,
      description: true,
      tags: true,
      semanticKeywords: true,
      attributes: true
    }
  });

  if (!product) return;

  const searchText = buildProductSearchText(product);

  await prisma.product.update({
    where: { id: productId },
    data: { searchText }
  });
}

/**
 * Batch updates search text for all entities
 * Useful for initial migration or periodic refresh
 */
export async function refreshAllSearchText(): Promise<void> {
  const prisma = getStorage().prisma;

  console.log('🔄 Refreshing vendor search text...');

  // Update all vendors
  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      businessType: true,
      type: true,
      description: true,
      address: true,
      locality: true,
      landmark: true,
      districtId: true
    }
  });

  for (const vendor of vendors) {
    try {
      const searchText = buildVendorSearchText(vendor);
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { searchText }
      });
    } catch (error) {
      console.error(`Failed to update vendor ${vendor.id}:`, error);
    }
  }

  console.log('🔄 Refreshing product search text...');

  // Update all products
  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      subCategory: true,
      description: true,
      tags: true,
      semanticKeywords: true,
      attributes: true
    }
  });

  for (const product of products) {
    try {
      const searchText = buildProductSearchText(product);
      await prisma.product.update({
        where: { id: product.id },
        data: { searchText }
      });
    } catch (error) {
      console.error(`Failed to update product ${product.id}:`, error);
    }
  }

  console.log('✅ Search text refresh complete');
}