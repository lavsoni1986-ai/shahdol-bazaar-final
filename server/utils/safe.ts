// 🧯 Central Error Wrapper for Routes
export function safe<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("[SAFE_WRAPPER_ERROR]", error);
      throw error; // Let Express handle it
    }
  };
}
