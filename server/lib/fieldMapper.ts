/**
 * ============================================
 * FIELD MAPPER - BharatOS
 * ============================================
 * Normalizes database fields to frontend-expected format
 * Fixes field name mismatches across different data sources
 */

/**
 * Map product from DB to frontend format
 */
export function mapProduct(dbProduct: any) {
  if (!dbProduct) return null;
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    price: dbProduct.fare || dbProduct.price || 0,
    categoryId: dbProduct.categoryId,
    districtId: dbProduct.districtId,
    createdAt: dbProduct.createdAt,
    status: dbProduct.status,
    image: dbProduct.image || dbProduct.imageUrl,
    description: dbProduct.description,
  };
}

/**
 * Map bus schedule from DB to frontend format
 */
export function mapBusSchedule(dbBus: any) {
  if (!dbBus) return null;
  return {
    id: dbBus.id,
    fromCity: dbBus.fromCity,
    toCity: dbBus.toCity,
    time: dbBus.time || dbBus.firstBusTime,
    lastTime: dbBus.lastTime || dbBus.lastBusTime,
    price: dbBus.price || dbBus.fare?.replace('₹', '') || 0,
    type: dbBus.type || dbBus.busType,
    routeDescription: dbBus.routeDescription || dbBus.travelTime || dbBus.publicNote,
    districtId: dbBus.districtId,
  };
}

/**
 * Map vendor from DB to frontend format
 */
export function mapVendor(dbVendor: any) {
  if (!dbVendor) return null;
  return {
    id: dbVendor.id,
    name: dbVendor.name,
    code: dbVendor.code,
    districtId: dbVendor.districtId,
    status: dbVendor.status || 'active',
    phone: dbVendor.phone,
    address: dbVendor.address,
  };
}

/**
 * Map store from DB to frontend format
 */
export function mapStore(dbStore: any) {
  if (!dbStore) return null;
  return {
    id: dbStore.id,
    name: dbStore.name,
    vendorId: dbStore.vendorId,
    districtId: dbStore.districtId,
    address: dbStore.address,
    phone: dbStore.phone,
    rating: dbStore.rating,
    category: dbStore.category,
  };
}

/**
 * Map service worker from DB to frontend format
 */
export function mapServiceWorker(dbWorker: any) {
  if (!dbWorker) return null;
  return {
    id: dbWorker.id,
    name: dbWorker.name,
    phone: dbWorker.phone,
    serviceType: dbWorker.serviceType,
    isAvailable: dbWorker.isAvailable,
    address: dbWorker.address,
    rating: dbWorker.rating,
    reviewCount: dbWorker.reviewCount,
    districtId: dbWorker.districtId,
  };
}

/**
 * Map school from DB to frontend format
 */
export function mapSchool(dbSchool: any) {
  if (!dbSchool) return null;
  return {
    id: dbSchool.id,
    name: dbSchool.name,
    address: dbSchool.address,
    phone: dbSchool.phone,
    type: dbSchool.type || dbSchool.schoolType,
    districtId: dbSchool.districtId,
  };
}

/**
 * Map hospital from DB to frontend format
 */
export function mapHospital(dbHospital: any) {
  if (!dbHospital) return null;
  return {
    id: dbHospital.id,
    name: dbHospital.name,
    address: dbHospital.address,
    phone: dbHospital.phone,
    type: dbHospital.type || dbHospital.hospitalType,
    emergencyPhone: dbHospital.emergencyPhone,
    districtId: dbHospital.districtId,
  };
}

/**
 * Map array of items
 */
export function mapArray<T>(items: T[], mapper: (item: any) => T): T[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapper);
}

export default {
  mapProduct,
  mapBusSchedule,
  mapVendor,
  mapStore,
  mapServiceWorker,
  mapSchool,
  mapHospital,
  mapArray,
};