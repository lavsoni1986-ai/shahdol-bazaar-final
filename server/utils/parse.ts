export function parseDistrictId(input: unknown): number | null {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? n : null;
}
