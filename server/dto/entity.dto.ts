/**
 * ============================================
 * CANONICAL ENTITY DTO
 * ============================================
 * Single source of truth for all entity responses
 * Ensures consistency across all APIs (Search, Discovery, Vendor Detail, etc.)
 * 
 * GOAL: ONE SOVEREIGN ENTITY GRAPH
 * - Same entity always returns same shape
 * - AI grounding uses unified DTOs
 * - Response consistency = better ranking
 */

import { z } from "zod";
import crypto from "crypto";
import { normalizeBusinessType, CanonicalBusinessType } from "../lib/entityNormalization";
import type { CanonicalEntityV2, CanonicalVendorEntityV2, AISearchResultContract } from '../../shared/contracts/entity.contract';

// ============================================
// ENTITY TYPE ENUM
// ============================================
export enum EntityType {
    VENDOR = "VENDOR",
    PRODUCT = "PRODUCT",
    HOSPITAL = "HOSPITAL",
    SCHOOL = "SCHOOL",
    SERVICE = "SERVICE",
    BUS = "BUS",
}

export enum BusinessType {
    PRODUCT = "PRODUCT",
    SERVICE = "SERVICE",
    HEALTHCARE = "HEALTHCARE",
    SCHOOL = "SCHOOL",
    RETAIL = "RETAIL",
    EDUCATION = "EDUCATION",
}

// ============================================
// CANONICAL ENTITY DTO (BASE)
// ============================================
export const canonicalEntitySchema = z.object({
    id: z.number().or(z.string()),
    entityType: z.nativeEnum(EntityType),
    businessType: z.nativeEnum(BusinessType).optional(),

    // Core identity
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),

    // Location & Contact
    districtId: z.number(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),

    // Branding
    logo: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),

    // Trust & Quality
    isVerified: z.boolean().nullable(),
    trustScore: z.number().min(0).max(100).default(70),
    rating: z.number().min(0).max(5).nullable().optional(),
    reviewCount: z.number().default(0),

    // DECISION INTELLIGENCE METADATA (P1 Expansion)
    trustLabel: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    openNow: z.boolean().nullable().optional(),
    waitTime: z.string().nullable().optional(),
    consultationMode: z.string().optional(),
    locality: z.string().optional(),
    emergencyAvailable: z.boolean().optional(),
    deliveryActive: z.boolean().optional(),

    // ACTIONABILITY COMPUTATION
    actionability: z.object({
        canCall: z.boolean().nullable().optional(),
        canWhatsApp: z.boolean().nullable().optional(),
        canNavigate: z.boolean().nullable().optional(),
        canBook: z.boolean().nullable().optional(),
        canOrder: z.boolean().nullable().optional(),
    }).optional(),

    // Visibility & Ranking
    isSponsored: z.boolean().nullable(),
    isTrending: z.boolean().nullable(),

    // Legacy metadata (entity-specific)
    meta: z.record(z.any()).optional(),

    // Timestamps
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type CanonicalEntity = z.infer<typeof canonicalEntitySchema>;

// ============================================
// VENDOR ENTITY DTO (Extends Canonical)
// ============================================
export const vendorEntitySchema = canonicalEntitySchema.extend({
    entityType: z.literal(EntityType.VENDOR),
    businessType: z.nativeEnum(BusinessType),

    category: z.string().optional(),
    serviceArea: z.string().nullable().optional(),
    serviceHours: z.string().nullable().optional(),
    specialties: z.array(z.string()).optional(),
    experience: z.number().nullable().optional(),

    products: z.array(z.any()).optional(),

    meta: z.object({
        businessType: z.string(),
        isVerified: z.boolean(),
        rating: z.number().optional(),
        reviewCount: z.number().optional(),
    }).optional(),
});

export type VendorEntity = z.infer<typeof vendorEntitySchema>;

// ============================================
// PRODUCT ENTITY DTO
// ============================================
export const productEntitySchema = canonicalEntitySchema.extend({
    entityType: z.literal(EntityType.PRODUCT),

    price: z.number().positive(),
    mrp: z.number().nullable().optional(),
    stock: z.number().default(0),
    inStock: z.boolean().default(true),

    vendorId: z.number(),
    vendorName: z.string().optional(),
    vendor: vendorEntitySchema.optional(),

    meta: z.object({
        price: z.number().optional(),
        mrp: z.number().optional(),
        inStock: z.boolean().optional(),
        vendorId: z.number().optional(),
        vendorName: z.string().optional(),
    }).optional(),
});

export type ProductEntity = z.infer<typeof productEntitySchema>;

// ============================================
// HEALTHCARE ENTITY DTO (Hospital)
// ============================================
export const healthcareEntitySchema = canonicalEntitySchema.extend({
    entityType: z.literal(EntityType.HOSPITAL),
    businessType: z.literal(BusinessType.HEALTHCARE),

    specialties: z.array(z.string()).optional(),
    availability24x7: z.boolean().optional(),
    ambulanceService: z.boolean().optional(),
    availableBeds: z.number().optional(),

    meta: z.object({
        specialties: z.array(z.string()).optional(),
        availability24x7: z.boolean().optional(),
        ambulanceService: z.boolean().optional(),
        availableBeds: z.number().optional(),
        businessType: z.literal("HEALTHCARE"),
    }).optional(),
});

export type HealthcareEntity = z.infer<typeof healthcareEntitySchema>;

// ============================================
// SCHOOL ENTITY DTO
// ============================================
export const schoolEntitySchema = canonicalEntitySchema.extend({
    entityType: z.literal(EntityType.SCHOOL),
    businessType: z.literal(BusinessType.SCHOOL),

    board: z.string().nullable().optional(),
    classes: z.array(z.string()).optional(),

    meta: z.object({
        board: z.string().optional(),
        classes: z.array(z.string()).optional(),
        businessType: z.literal("SCHOOL"),
    }).optional(),
});

export type SchoolEntity = z.infer<typeof schoolEntitySchema>;

// ============================================
// SERVICE ENTITY DTO (Worker)
// ============================================
export const serviceEntitySchema = canonicalEntitySchema.extend({
    entityType: z.literal(EntityType.SERVICE),
    businessType: z.literal(BusinessType.SERVICE),

    category: z.string().optional(),
    skillTags: z.array(z.string()).optional(),
    hourlyRate: z.number().nullable().optional(),
    availability: z.boolean().optional(),

    meta: z.object({
        category: z.string().optional(),
        skillTags: z.array(z.string()).optional(),
        hourlyRate: z.number().optional(),
        availability: z.boolean().optional(),
        businessType: z.literal("SERVICE"),
    }).optional(),
});

export type ServiceEntity = z.infer<typeof serviceEntitySchema>;

// ============================================
// UNIFIED ENTITY RESPONSE
// ============================================
export const unifiedEntityResponseSchema = z.object({
    success: z.boolean(),
    data: z.union([
        vendorEntitySchema,
        productEntitySchema,
        healthcareEntitySchema,
        schoolEntitySchema,
        serviceEntitySchema,
    ]),
    meta: z.object({
        entityType: z.nativeEnum(EntityType),
        sourceTable: z.string(),
        timestamp: z.date().optional(),
    }).optional(),
});

export type UnifiedEntityResponse = z.infer<typeof unifiedEntityResponseSchema>;

// ============================================
// ENTITY LIST RESPONSE
// ============================================
export const entityListResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(canonicalEntitySchema),
    meta: z.object({
        count: z.number(),
        districtId: z.number(),
        total: z.number().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
    }).optional(),
});

export type EntityListResponse = z.infer<typeof entityListResponseSchema>;

// ============================================
// MAPPERS: Convert DB models to DTO
// ============================================

function normalizeNonEmptyString(value: any): string {
    if (typeof value !== "string") return "";
    return value.trim();
}

function getVendorDisplayName(vendor: any): string {
    const directName = normalizeNonEmptyString(vendor?.name);
    if (directName) return directName;

    const slug = normalizeNonEmptyString(vendor?.slug);
    if (slug) return slug.replace(/[-_]+/g, " ").trim();

    // Audit vendor name collapse
    import("../storage").then(({ prisma }) => {
        const auditPayload = {
            vendorId: vendor?.id,
            hasName: !!vendor?.name,
            hasSlug: !!vendor?.slug,
            nameValue: vendor?.name,
            slugValue: vendor?.slug
        };
        prisma.auditLog.create({
            data: {
                action: "VENDOR_NAME_COLLAPSE",
                entityType: "VENDOR",
                entityId: vendor?.id || 0,
                hash: crypto.createHash('sha256').update(JSON.stringify(auditPayload)).digest('hex'),
                details: JSON.stringify(auditPayload)
            }
        }).catch(() => { }); // Never block on audit
    });

    return "Local Partner";
}

function isVendorVerified(vendor: any): boolean {
    return vendor?.status === "APPROVED" || vendor?.isVerified === true;
}

/** Derive isSponsored from canonical boostedUntil field */
function deriveSponsored(vendor: any): boolean {
    return !!(vendor?.boostedUntil && new Date(vendor.boostedUntil) > new Date());
}

/**
 * Convert Vendor DB model to DTO
 */
export async function mapVendorToDTO(vendor: any, include?: any): Promise<VendorEntity> {
    const vendorName = getVendorDisplayName(vendor);
    const verified = isVendorVerified(vendor);

    // HYDRATE RICH METADATA (P1 Expansion)
    const { hydrateVendorMetadata } = await import("../../shared/discovery-gateway");
    const richMetadata = await hydrateVendorMetadata(vendor, {});

    return {
        id: vendor.id,
        entityType: EntityType.VENDOR,
        businessType: vendor.businessType as BusinessType,
        name: vendorName,
        slug: vendor.slug,
        description: vendor.description,
        districtId: vendor.districtId,
        address: vendor.address,
        phone: vendor.phone || vendor.mobile,
        logo: vendor.logo,
        images: vendor.images || [],
        isVerified: verified,
        trustScore: vendor.trustScore ?? vendor.dsslScore,
        rating: vendor.rating || null,
        reviewCount: 0,
        isSponsored: deriveSponsored(vendor),
        isTrending: vendor.isTrending ?? null,

        // DECISION INTELLIGENCE FIELDS (P1)
        trustLabel: richMetadata.trustAssessment?.label,
        specializations: richMetadata.specializations,
        openNow: richMetadata.openNow,
        waitTime: richMetadata.waitTime,
        consultationMode: richMetadata.consultationMode,
        locality: vendor.locality,
        emergencyAvailable: richMetadata.emergencyAvailable,
        deliveryActive: richMetadata.deliveryActive,
        actionability: richMetadata.actionability,

        category: vendor.category,
        serviceArea: vendor.serviceArea || null,
        serviceHours: vendor.serviceHours || null,
        specialties: vendor.specialties || [],
        experience: vendor.experience || null,
        products: include?.products || undefined,
        meta: {
            businessType: vendor.businessType,
            isVerified: verified,
            rating: vendor.rating,
            reviewCount: 0,
        },
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
    };
}

/**
 * Convert Product DB model to DTO
 */
export async function mapProductToDTO(product: any, vendor?: any): Promise<ProductEntity> {
    // Hard assertion: audit missing product titles
    if (!product.title || product.title.trim() === "") {
        // Import prisma here for audit logging
        import("../storage").then(({ prisma }) => {
            const auditPayload = {
                productId: product.id,
                vendorId: product.vendorId,
                hasTitle: !!product.title,
                titleValue: product.title,
                slug: product.slug
            };
            prisma.auditLog.create({
                data: {
                    action: "ENTITY_TITLE_COLLAPSE",
                    entityType: "PRODUCT",
                    entityId: product.id,
                    hash: crypto.createHash('sha256').update(JSON.stringify(auditPayload)).digest('hex'),
                    details: JSON.stringify(auditPayload)
                }
            }).catch(() => { }); // Never block on audit
        });
    }

    const productImages: string[] =
        product.images?.length
            ? product.images.map((img: any) => img.url)
            : product.imageUrl
                ? [product.imageUrl]
                : [];

    return {
        id: product.id,
        entityType: EntityType.PRODUCT,
        name: product.title || "Local Product",
        slug: product.slug || String(product.id),
        description: product.description,
        districtId: vendor?.districtId || 1,
        address: vendor?.address,
        phone: vendor?.phone || vendor?.mobile,
        logo: product.imageUrl || null,
        images: productImages,
        price: product.price || 0,
        mrp: product.mrp || null,
        stock: product.stock || 0,
        inStock: (product.stock || 0) > 0,
        isVerified: isVendorVerified(vendor),
        rating: vendor?.rating || null,
        reviewCount: 0,
        isSponsored: false,
        isTrending: product.isTrending ?? null,
        trustScore: vendor?.trustScore ?? vendor?.dsslScore ?? 60,
        vendorId: product.vendorId,
        vendorName: vendor ? getVendorDisplayName(vendor) : undefined,
        vendor: vendor ? await mapVendorToDTO(vendor) : undefined,
        meta: {
            price: product.price,
            mrp: product.mrp,
            inStock: (product.stock || 0) > 0,
            vendorId: product.vendorId,
            vendorName: vendor ? getVendorDisplayName(vendor) : undefined,
        },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
}

/**
 * Convert Hospital/Healthcare Vendor to DTO
 */
export function mapHealthcareToDTO(vendor: any): HealthcareEntity {
    const hospitalData = vendor.hospitalData || {};
    const vendorName = getVendorDisplayName(vendor);
    const verified = isVendorVerified(vendor);
    return {
        id: vendor.id,
        entityType: EntityType.HOSPITAL,
        businessType: BusinessType.HEALTHCARE,
        name: vendorName,
        slug: vendor.slug,
        description: vendor.description,
        districtId: vendor.districtId,
        address: vendor.address,
        phone: vendor.phone || vendor.mobile,
        logo: vendor.logo,
        specialties: vendor.specialties || [],
        availability24x7: hospitalData.is24x7 ?? null,
        ambulanceService: hospitalData.ambulanceService ?? null,
        availableBeds: hospitalData.availableBeds || 0,
        isVerified: verified,
        trustScore: vendor.trustScore ?? vendor.dsslScore,
        rating: vendor.rating || null,
        reviewCount: 0,
        isSponsored: deriveSponsored(vendor),
        isTrending: false,
        meta: {
            specialties: vendor.specialties || [],
            availability24x7: hospitalData.is24x7 ?? null,
            ambulanceService: hospitalData.ambulanceService ?? null,
            availableBeds: hospitalData.availableBeds || 0,
            businessType: "HEALTHCARE",
        },
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
    };
}

/**
 * Convert School/Education Vendor to DTO
 */
export function mapSchoolToDTO(vendor: any): SchoolEntity {
    const vendorName = getVendorDisplayName(vendor);
    const verified = isVendorVerified(vendor);
    return {
        id: vendor.id,
        entityType: EntityType.SCHOOL,
        businessType: BusinessType.SCHOOL,
        name: vendorName,
        slug: vendor.slug,
        description: vendor.description,
        districtId: vendor.districtId,
        address: vendor.address,
        phone: vendor.phone || vendor.mobile,
        logo: vendor.logo,
        board: vendor.specialties?.[0] || null,
        classes: [],
        isVerified: verified,
        trustScore: vendor.trustScore ?? vendor.dsslScore,
        rating: vendor.rating || null,
        reviewCount: 0,
        isSponsored: deriveSponsored(vendor),
        isTrending: false,
        meta: {
            board: vendor.specialties?.[0] || null,
            classes: [],
            businessType: "SCHOOL",
        },
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
    };
}

/**
 * Convert Service/Worker Vendor to DTO
 */
export function mapServiceToDTO(vendor: any): ServiceEntity {
    const serviceData = vendor.hospitalData || {};
    const vendorName = getVendorDisplayName(vendor);
    const verified = isVendorVerified(vendor);
    return {
        id: vendor.id,
        entityType: EntityType.SERVICE,
        businessType: BusinessType.SERVICE,
        name: vendorName,
        slug: vendor.slug,
        description: vendor.description,
        districtId: vendor.districtId,
        address: vendor.address,
        phone: vendor.phone || vendor.mobile,
        logo: vendor.logo,
        category: vendor.category,
        skillTags: vendor.specialties || [],
        hourlyRate: serviceData.hourlyRate || null,
        availability: serviceData.isAvailable !== false,
        isVerified: verified,
        trustScore: vendor.trustScore ?? vendor.dsslScore,
        rating: vendor.rating || null,
        reviewCount: serviceData.reviewCount || 0,
        isSponsored: deriveSponsored(vendor),
        isTrending: false,
        meta: {
            category: vendor.category,
            skillTags: vendor.specialties || [],
            hourlyRate: serviceData.hourlyRate,
            availability: serviceData.isAvailable !== false,
            businessType: "SERVICE",
        },
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
    };
}

/**
 * Universal mapper - converts any vendor to appropriate DTO based on businessType
 */

export async function mapVendorByType(vendor: any, include?: any):
    Promise<CanonicalVendorEntityV2 | VendorEntity | HealthcareEntity | SchoolEntity | ServiceEntity> {

    // Use canonical business type for consistent mapping
    const canonicalType = normalizeBusinessType(vendor.businessType);

    switch (canonicalType) {
        case CanonicalBusinessType.HEALTHCARE:
            return mapHealthcareToDTO(vendor);
        case CanonicalBusinessType.EDUCATION:
            return mapSchoolToDTO(vendor);
        case CanonicalBusinessType.FOOD:
        case CanonicalBusinessType.TRANSPORT:
        case CanonicalBusinessType.RETAIL:
        case CanonicalBusinessType.HOSPITALITY:
        case CanonicalBusinessType.FINANCIAL:
        case CanonicalBusinessType.PROFESSIONAL:
        case CanonicalBusinessType.ENTERTAINMENT:
            return mapServiceToDTO(vendor);
        default: {
            const base = await mapVendorToDTO(vendor, include);
            const id = typeof base.id === "string" ? parseInt(base.id, 10) || 0 : base.id;
            const canonical: CanonicalVendorEntityV2 & { id: number } = {
                id,
                canonicalId: base.slug ? `vendor:${base.slug}` : String(base.id),
                title: base.name,
                subtitle: base.slug || undefined,
                description: base.description || undefined,
                logoUrl: base.logo || undefined,
                contactNumber: base.phone || undefined,
                address: base.address || undefined,
                rating: base.rating ?? undefined,
                trustScore: (base as any).trustScore ?? (base as any).dsslScore ?? undefined,
                trustLabel: base.trustLabel ?? undefined,
                safetyBadges: (base as any).safetyBadges ?? undefined,
                processingSteps: (base as any).processingSteps ?? undefined,
                performanceMetrics: (base as any).performanceMetrics ?? undefined,
                meta: {
                    ...(base.meta || {}),
                    legacy: {
                        dsslScore: (base as any).dsslScore ?? undefined,
                        isSponsored: base.isSponsored ?? undefined,
                    }
                }
            };

            return canonical;
        }
    }
}
