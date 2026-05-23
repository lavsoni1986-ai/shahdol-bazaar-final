// server/lib/categoryMapper.ts
// DEPRECATED AUTHORITY - DO NOT USE FOR NEW LOGIC
// Maps frontend category strings to backend enum values
// This file is frozen. New semantic logic must use shared/contracts/ontology

export const categoryMap: Record<string, string> = {
  hospital: 'HOSPITAL',
  doctor: 'HOSPITAL',
  clinic: 'HOSPITAL',
  pharmacy: 'PHARMACY',
  grocery: 'GROCERY',
  kirana: 'GROCERY',
  store: 'GROCERY',
  shop: 'GROCERY',
  service: 'SERVICE',
  plumber: 'SERVICE',
  electrician: 'SERVICE',
  carpenter: 'SERVICE',
  education: 'EDUCATION',
  school: 'EDUCATION',
  coaching: 'EDUCATION',
  transport: 'TRANSPORT',
  bus: 'TRANSPORT',
  taxi: 'TRANSPORT'
}

export function mapCategory(frontendCategory: string): string {
  return categoryMap[frontendCategory.toLowerCase()] || frontendCategory.toUpperCase()
}

export function getAllCategories(): string[] {
  return ['HOSPITAL', 'PHARMACY', 'GROCERY', 'SERVICE', 'EDUCATION', 'TRANSPORT']
}