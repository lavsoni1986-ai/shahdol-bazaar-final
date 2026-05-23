import { smartSearch } from "./ai-brain";
import { apiRequest } from "./api-client";

// Simplified AI Router - just routing, no data fetching
export async function aiRouter(query: string, districtSlug: string) {
  const q = query.toLowerCase()

  if (q.includes("bus") || q.includes("बस") || q.includes("timing") || q.includes("time") || q.includes("schedule")) {
    return { route: `/${districtSlug}/bus-timetable` }
  }

  if (q.includes("hospital") || q.includes("doctor") || q.includes("अस्पताल") || q.includes("डॉक्टर") || q.includes("clinic")) {
    return { route: `/${districtSlug}/hospitals` }
  }

  return {
    route: `/${districtSlug}/search?q=${encodeURIComponent(query)}`
  }
}