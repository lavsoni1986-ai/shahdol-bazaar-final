import { prisma } from "../storage";
import { mapVendorToDTO, mapProductToDTO, mapHealthcareToDTO, mapSchoolToDTO, mapServiceToDTO } from "../dto/entity.dto";
import { calculateInheritedTrust } from "../lib/cognition/trust-inheritance.engine";
import { auditMissingVendorName, hydrateCommerceMetadata, hydrateDoctorMetadata, hydrateHospitalMetadata, fetchVendorMetadata } from "../../shared/discovery-gateway";

export type DiscoveryActionType = "BUY" | "INQUIRY" | "BOOK" | "VIEW";

export type DiscoveryEntityType =
  | "SHOP"
  | "PRODUCT"
  | "HOSPITAL"
  | "SCHOOL"
  | "SERVICE"
  | "DOCTOR"
  | "BUS";

export interface DiscoveryEntity {
  id: string;
  districtId: number;
  entityType: DiscoveryEntityType;
  actionType: DiscoveryActionType;
  title: string;
  slug: string;
  subtitle?: string;
  image?: string | null;
  phone?: string | null;
  address?: string | null;
  dsslScore: number;
  isSponsored: boolean;
  sourceTable: string;
  sourceId: string | number;
  meta?: any;
  rankScore?: number;
  createdAt?: Date | null;
}

/* ============================
   SOVEREIGN CONFIG
=========================== */

const DISCOVERY_BUDGET = {
  vendors: 8,
  products: 10,
  hospitals: 6,
  schools: 6,
  workers: 8,
  doctors: 10,
  buses: 4,
};

const SEARCH_LIMIT = 50;

/* ============================
   SAFE QUERY WRAPPER
=========================== */

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    return fallback;
  }
}

/* ============================
   RANK ENGINE
=========================== */

function freshnessBoost(createdAt?: Date | null): number {
  if (!createdAt) return 0;

  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= 7) return 12;
  if (ageDays <= 30) return 8;
  if (ageDays <= 90) return 4;
  return 0;
}

function verificationBoost(entity: DiscoveryEntity): number {
  if (entity.meta?.isVerified) return 10;
  return 0;
}

function availabilityBoost(entity: DiscoveryEntity): number {
  if (entity.meta?.isAvailable) return 6;
  if (entity.meta?.is24x7) return 5;
  if (entity.meta?.availableBeds && entity.meta.availableBeds > 0) return 5;
  return 0;
}

function engagementBoost(entity: DiscoveryEntity): number {
  let score = 0;

  if (entity.meta?.rating) score += Math.round(Number(entity.meta.rating) * 2);
  if (entity.meta?.reviewCount) score += Math.min(6, Math.floor(entity.meta.reviewCount / 10));

  return score;
}

function sponsoredBoost(entity: DiscoveryEntity): number {
  return entity.isSponsored ? 15 : 0;
}

function calculateDiscoveryRank(entity: DiscoveryEntity): number {
  return (
    Number(entity.dsslScore || 0) +
    sponsoredBoost(entity) +
    verificationBoost(entity) +
    availabilityBoost(entity) +
    engagementBoost(entity) +
    freshnessBoost(entity.createdAt)
  );
}

/* ============================
   MAPPERS
=========================== */

async function mapVendor(v: any, sovereignMetadata?: any): Promise<DiscoveryEntity> {
  const dto = await mapVendorToDTO(v);
  const entity: DiscoveryEntity = {
    id: `SHOP-${dto.id}`,
    districtId: dto.districtId,
    entityType: "SHOP",
    actionType: "BUY",
    title: dto.name,
    slug: dto.slug,
    subtitle: dto.businessType || dto.category,
    image: dto.logo,
    phone: dto.phone,
    address: dto.address,
    dsslScore: dto.dsslScore || 70,
    isSponsored: dto.isSponsored || false,
    sourceTable: "Vendor",
    sourceId: dto.id,
    createdAt: dto.createdAt,
    meta: { ...dto, sovereignMetadata },
  };

  entity.rankScore = calculateDiscoveryRank(entity);
  return entity;
}

async function mapProduct(p: any): Promise<DiscoveryEntity> {
  const dto = await mapProductToDTO(p, p.vendor);
  const entity: DiscoveryEntity = {
    id: `PRODUCT-${dto.id}`,
    districtId: p.vendor?.districtId || 0,
    entityType: "PRODUCT",
    actionType: "BUY",
    title: dto.name,
    slug: String(dto.id),
    subtitle: p.vendor?.name || "Product",
    image: dto.imageUrl,
    phone: p.vendor?.phone,
    address: p.vendor?.address,
    dsslScore: p.vendor?.dsslScore || 60,
    isSponsored: !!(p.vendor?.boostedUntil && new Date(p.vendor.boostedUntil) > new Date()),
    sourceTable: "Product",
    sourceId: dto.id,
    createdAt: p.createdAt,
    meta: dto,
  };

  entity.rankScore = calculateDiscoveryRank(entity);
  return entity;
}

function mapHospital(h: any, sovereignMetadata?: any): DiscoveryEntity {
  const dto = mapHealthcareToDTO(h);
  const entity: DiscoveryEntity = {
    id: `HOSPITAL-${dto.id}`,
    districtId: dto.districtId,
    entityType: "HOSPITAL",
    actionType: "INQUIRY",
    title: dto.name,
    slug: dto.slug,
    subtitle: dto.businessType || "Hospital",
    image: dto.logo,
    phone: dto.phone,
    address: dto.address,
    dsslScore: dto.dsslScore || 70,
    isSponsored: dto.isSponsored || false,
    sourceTable: "Vendor",
    sourceId: dto.id,
    createdAt: dto.createdAt,
    meta: { ...dto, sovereignMetadata },
  };

  entity.rankScore = calculateDiscoveryRank(entity);
  return entity;
}

function mapSchool(s: any): DiscoveryEntity {
  const dto = mapSchoolToDTO(s);
  const entity: DiscoveryEntity = {
    id: `SCHOOL-${dto.id}`,
    districtId: dto.districtId,
    entityType: "SCHOOL",
    actionType: "INQUIRY",
    title: dto.name,
    slug: dto.slug,
    subtitle: dto.businessType || "School",
    image: dto.logo,
    phone: dto.phone,
    address: dto.address,
    dsslScore: dto.dsslScore || 65,
    isSponsored: dto.isSponsored || false,
    sourceTable: "Vendor",
    sourceId: dto.id,
    createdAt: dto.createdAt,
    meta: dto,
  };

  entity.rankScore = calculateDiscoveryRank(entity);
  return entity;
}

function mapWorker(w: any): DiscoveryEntity {
  const dto = mapServiceToDTO(w);
  const entity: DiscoveryEntity = {
    id: `SERVICE-${dto.id}`,
    districtId: dto.districtId,
    entityType: "SERVICE",
    actionType: "BOOK",
    title: dto.name,
    slug: dto.slug,
    subtitle: dto.businessType || "Service",
    image: dto.logo,
    phone: dto.phone,
    address: dto.address,
    dsslScore: dto.dsslScore || 75,
    isSponsored: dto.isSponsored || false,
    sourceTable: "Vendor",
    sourceId: dto.id,
    createdAt: dto.createdAt,
    meta: dto,
  };

  entity.rankScore = calculateDiscoveryRank(entity);
  return entity;
}

function mapBus(b: any): DiscoveryEntity {
  const entity: DiscoveryEntity = {
    id: `BUS-${b.id}`,
    districtId: b.districtId,
    entityType: "BUS",
    actionType: "VIEW",
    title: `${b.fromCity} → ${b.toCity}`,
    slug: String(b.id),
    subtitle: b.operatorName || "Bus Service",
    image: null,
    phone: null,
    address: b.boardingPoint || null,
    dsslScore: 60,
    isSponsored: false,
    sourceTable: "BusTimetable",
    sourceId: b.id,
    createdAt: b.createdAt || null,
    meta: {
      fare: b.fare,
      firstBusTime: b.firstBusTime,
      lastBusTime: b.lastBusTime,
    },
  };

  entity.rankScore = calculateDiscoveryRank(entity);
  return entity;
}

function mapDoctor(d: any, sovereignMetadata?: any): DiscoveryEntity {
  const vendor = d.vendor;
  const vendorName = vendor?.name || vendor?.slug || "Unknown Vendor";
  const title = (d.name || "").trim() || "Unknown Doctor";
  const specialization = (d.specialization || "").trim();

  const entity: DiscoveryEntity = {
    id: `DOCTOR-${d.id}`,
    districtId: vendor?.districtId || 0,
    entityType: "DOCTOR",
    actionType: "BOOK",
    title,
    slug: String(d.id),
    subtitle: specialization || vendorName,
    image: d.image || vendor?.logo || null,
    phone: vendor?.phone || vendor?.mobile || null,
    address: vendor?.address || null,
    dsslScore: calculateInheritedTrust(70, vendor?.dsslScore ?? null),
    isSponsored: !!(vendor?.boostedUntil && new Date(vendor.boostedUntil) > new Date()),
    sourceTable: "Doctor",
    sourceId: d.id,
    createdAt: d.createdAt,
    meta: {
      doctorId: d.id,
      doctorName: d.name,
      specialization: d.specialization || null,
      qualification: d.qualification || null,
      experience: d.experience || 0,
      consultationFee: d.consultationFee || 0,
      timing: d.timing || null,
      vendorId: vendor?.id,
      vendorName,
      vendorSlug: vendor?.slug,
      isVerified: vendor?.status === "APPROVED",
      sovereignMetadata,
    },
  };

  entity.rankScore = calculateDiscoveryRank(entity);
  return entity;
}

/* ============================
   MASTER FEED
=========================== */

export async function getUnifiedDiscoveryFeed(districtId: number): Promise<DiscoveryEntity[]> {
  const [vendors, products, hospitals, schools, workers, doctors, buses] = await Promise.all([
    safeQuery(
      () =>
        prisma.vendor.findMany({
          where: {
            districtId,
            status: "APPROVED" as any,
            isShadowBanned: false,
            businessType: { not: 'SERVICE' }, // Exclude services for now
          },
          take: DISCOVERY_BUDGET.vendors,
        }),
      []
    ),

    safeQuery(
      () =>
        prisma.product.findMany({
          where: {
            approved: true,
            status: { in: ["APPROVED", "approved", "ACTIVE", "active"] },
            vendor: {
              districtId,
              status: "APPROVED" as any,
              isShadowBanned: false,
            },
          },
          include: {
            vendor: true,
            images: true,
          },
          take: DISCOVERY_BUDGET.products,
          orderBy: { createdAt: "desc" },
        }),
      []
    ),

    // Hospitals now from Vendor table
    safeQuery(
      () =>
        prisma.vendor.findMany({
          where: {
            districtId,
            businessType: 'HEALTHCARE',
            status: "APPROVED" as any,
            isShadowBanned: false,
          },
          take: DISCOVERY_BUDGET.hospitals,
          orderBy: { createdAt: "desc" },
        }),
      []
    ),

    // Schools now from Vendor table
    safeQuery(
      () =>
        prisma.vendor.findMany({
          where: {
            districtId,
            businessType: 'SCHOOL',
            status: "APPROVED" as any,
            isShadowBanned: false,
          },
          take: DISCOVERY_BUDGET.schools,
        }),
      []
    ),

    // Services now from Vendor table
    safeQuery(
      () =>
        prisma.vendor.findMany({
          where: {
            districtId,
            businessType: 'SERVICE',
            status: "APPROVED" as any,
            isShadowBanned: false,
          },
          take: DISCOVERY_BUDGET.workers,
        }),
      []
    ),

    safeQuery(
      () =>
        prisma.doctor.findMany({
          where: {
            vendor: {
              districtId,
              status: "APPROVED" as any,
              isShadowBanned: false,
            },
          },
          include: {
            vendor: true,
          },
          take: DISCOVERY_BUDGET.doctors,
          orderBy: { createdAt: "desc" },
        }),
      []
    ),

    safeQuery(
      () =>
        prisma.busTimetable.findMany({
          where: {
            districtId,
            isActive: true,
          },
          take: DISCOVERY_BUDGET.buses,
          orderBy: { createdAt: "desc" },
        }),
      []
    ),

  ]);

  // Data governance: audit missing vendor names (never blocks feed)
  await Promise.all([
    ...vendors.map(v => auditMissingVendorName(v)),
    ...hospitals.map(v => auditMissingVendorName(v)),
    ...schools.map(v => auditMissingVendorName(v)),
    ...workers.map(v => auditMissingVendorName(v)),
    ...doctors.map(d => auditMissingVendorName(d?.vendor)),
  ]);

  // Entity Hydration Layer v2: cast thin DB data into rich sovereign metadata contracts
  const [vendorMetaPairs, hospitalMetaPairs, doctorMetaPairs] = await Promise.all([
    Promise.all(vendors.map(async v => {
      const metadata = await fetchVendorMetadata(v.id);
      return [v.id, await hydrateCommerceMetadata(v, metadata)] as const;
    })),
    Promise.all(hospitals.map(async h => [h.id, await hydrateHospitalMetadata(h)] as const)),
    Promise.all(doctors.map(async d => [d.id, await hydrateDoctorMetadata({ doctor: d, vendor: d.vendor })] as const)),
  ]);

  const vendorMetadataById = new Map<number, any>(vendorMetaPairs as any);
  const hospitalMetadataById = new Map<number, any>(hospitalMetaPairs as any);
  const doctorMetadataById = new Map<string, any>(doctorMetaPairs as any);

  const feed: DiscoveryEntity[] = [
    ...(await Promise.all(vendors.map(v => mapVendor(v, vendorMetadataById.get(v.id))))),
    ...(await Promise.all(products.map(mapProduct))),
    ...hospitals.map(h => mapHospital(h, hospitalMetadataById.get(h.id))),
    ...schools.map(mapSchool),
    ...workers.map(mapWorker),
    ...doctors.map(d => mapDoctor(d, doctorMetadataById.get(d.id))),
    ...buses.map(mapBus),
  ];

  // Sort by rank and apply budget limits
  const sorted = feed.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));

  return sorted.slice(0, SEARCH_LIMIT);
}

export async function getDiscoveryByType(districtId: number, type: string): Promise<DiscoveryEntity[]> {
  const feed = await getUnifiedDiscoveryFeed(districtId);
  return feed.filter(entity => entity.entityType === type);
}

export async function getTopDiscoveryPicks(districtId: number, limit: number): Promise<DiscoveryEntity[]> {
  const feed = await getUnifiedDiscoveryFeed(districtId);
  return feed.slice(0, limit);
}

/* ============================
   RANKING CALCULATION
=========================== */
