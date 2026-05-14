/**
 * ============================================
 * DTO INDEX - BharatOS Type-Safe API Layer
 * ============================================
 * Centralized export of all Data Transfer Objects
 *
 * This file provides a single entry point for all DTOs
 * used throughout the BharatOS API system.
 */

// Auth DTOs
export * from "./auth.dto";

// Marketplace DTOs
export type { StoresQueryDTO, StoreParamsDTO, CategoriesResponseDTO, StoresResponseDTO, ProductDetailResponseDTO, StoreDetailResponseDTO } from "./marketplace.dto";

// Order DTOs
export * from "./order.dto";

// Vendor DTOs
export * from "./vendor.dto";

// Product DTOs
export * from "./product.dto";

// Admin DTOs
export * from "./admin.dto";

