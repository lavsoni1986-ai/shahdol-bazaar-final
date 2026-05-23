export function safeData<T>(res: any, fallback: T): T {
  // React Query initial undefined state
  if (res === undefined || res === null) {
    // silent initial query state
    return fallback;
  }

  if (res.success === false) {
    console.error("❌ API Error:", res);
    return fallback;
  }

  if (res.success === true && res.data !== undefined) {
    return res.data as T;
  }

  if (res.data !== undefined) {
    return res.data as T;
  }

  if (Array.isArray(res)) {
    return res as T;
  }

  if (typeof res === "object") {
    return res as T;
  }

  console.error("❌ Invalid API shape:", res);
  return fallback;
}

export function safeText(val: any): string {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (typeof val === "object") {
    return String(val.name || val.slug || val.title || JSON.stringify(val));
  }
  return String(val);
}