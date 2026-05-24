/**
 * ============================================
 * PURE SLUG UTILITY
 * ============================================
 * 
 * Provides pure utility functions to format and construct SEO-friendly and 
 * database-neutral slug strings. 
 * 
 * This file is PURE:
 * - NO prisma/database imports.
 * - NO side effects or external queries.
 * - NO asynchronous execution.
 */

/**
 * Sanitizes a raw string by converting to lowercase, replacing non-alphanumeric 
 * characters with hyphens, and trimming leading/trailing hyphens.
 */
export function sanitizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Generates a clean base slug from a product/entity name.
 * Falls back to "product" if the sanitized result is empty.
 */
export function baseSlug(name: string): string {
  const sanitized = sanitizeSlug(name);
  return sanitized || "product";
}

/**
 * Appends a numeric or string suffix to a slug safely with a hyphen connector.
 */
export function appendSuffix(slug: string, suffix: string | number): string {
  const cleanBase = slug.replace(/-$/, "");
  const cleanSuffix = String(suffix).trim().replace(/^-|-$/, "");
  return `${cleanBase}-${cleanSuffix}`;
}
