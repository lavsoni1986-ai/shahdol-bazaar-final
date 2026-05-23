// Safe execution wrapper for non-blocking operations in BharatOS cognition pipeline
// Prevents orchestration corruption and ensures graceful degradation

export async function safeExecute(
  operation: string,
  fn: () => Promise<void>,
  operationErrors: string[]
): Promise<void> {
  try {
    await fn();
  } catch (error: any) {
    operationErrors.push(`${operation}: ${error.message}`);
    console.warn(`[SAFE_EXECUTE_FAILED] ${operation}:`, error.message);
  }
}