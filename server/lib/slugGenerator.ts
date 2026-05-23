// Utility for generating and validating slugs for public entities

export function generateSlug(name: string, districtSlug: string = 'shahdol'): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .concat(`-${districtSlug}`);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && !slug.startsWith('-') && !slug.endsWith('-');
}

export function ensureSlugImmutability(existingSlug: string | null, name: string, districtSlug: string): string {
  // 🔒 SLUG IMMUTABILITY: Never change existing valid slugs
  if (existingSlug && isValidSlug(existingSlug)) {
    return existingSlug;
  }

  // Generate new slug only if none exists or invalid
  return generateSlug(name, districtSlug);
}

// Usage examples:
// generateSlug("Shri Ram Hospital", "shahdol") → "shri-ram-hospital-shahdol"
// isValidSlug("shri-ram-hospital-shahdol") → true
// isValidSlug("invalid-slug-") → false
// ensureSlugImmutability("existing-slug", "New Name", "district") → "existing-slug"