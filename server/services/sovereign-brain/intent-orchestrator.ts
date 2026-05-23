// Intent Orchestrator
// Handles query intent classification and processing

import { classifyQueryIntent } from '../../lib/cognition/intent.engine';

// 🛡️ Sovereign Intent Guardrail
export const processQueryIntent = async (query: string, districtId: number, cognition: any = {}) => {
  const cleanQuery = String(query || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  // Regex: 1-2 character fragments or pure noise
  const isFragment = cleanQuery.length < 3 || /^[a-z]{1,2}$/.test(cleanQuery);

  if (isFragment) {
    return {
      intent: null,
      districtId,
      status: "REJECTED_FRAGMENT" as const,
      shouldPersistTelemetry: false,
      shouldLearn: false, // 🎯 Poisoning Prevention
      reason: "Fragment detected - ignoring keystroke pollution",
      processedAt: new Date(),
    };
  }

  const intent = classifyQueryIntent(cleanQuery, cognition).structuredIntent;

  return {
    intent,
    districtId,
    status: "OK" as const,
    shouldPersistTelemetry: true,
    shouldLearn: true,
    processedAt: new Date()
  };
};

// Re-export for convenience
export { classifyQueryIntent } from '../../lib/cognition/intent.engine';
