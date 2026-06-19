/**
 * Centralized server-side logger utility for BharatOS.
 * Only logs console statements in development mode to prevent production log pollution.
 */
export function serverLog(message?: any, ...optionalParams: any[]) {
  if (process.env.NODE_ENV === "development") {
    console.log(message, ...optionalParams);
  }
}
