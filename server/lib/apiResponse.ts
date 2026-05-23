// Standardized Sovereign Response Contract
// ALL API responses MUST use this format:
// { success: boolean, data?: T, error?: string, meta?: any }

import { Response } from "express";

export interface SovereignResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}

// Sovereign Response Helpers - use ONLY these
export const sovereignSuccess = <T>(
  res: any,
  data: T,
  meta?: any
): any => {
  return res.json({
    success: true,
    data,
    meta
  });
};

export const sovereignFailure = (
  res: any,
  error: string,
  status = 400,
  meta?: any
): any => {
  return res.status(status).json({
    success: false,
    error,
    meta
  });
};

// Additional response helpers
export const unauthorized = (res: any, message = "Unauthorized") =>
  sovereignFailure(res, message, 401);

export const notFound = (res: any, message = "Not found") =>
  sovereignFailure(res, message, 404);

export const forbidden = (res: any, message = "Forbidden") =>
  sovereignFailure(res, message, 403);

export const serverError = (res: any, message = "Internal server error") =>
  sovereignFailure(res, message, 500);

export const validationError = (res: any, message = "Validation error", details?: any) =>
  sovereignFailure(res, message, 400, details);

// Higher-order function for district-aware responses
export const withDistrict = (handler: Function) => {
  return async (req: any, res: any) => {
    if (!req.ctx?.districtId) {
      return unauthorized(res, "District context required");
    }
    return handler(req, res);
  };
};

// Runtime validation to detect misuse
function isExpressResponse(res: any): res is Response {
  return !!(res && typeof res.status === "function" && typeof res.json === "function");
}

// Legacy compatibility and safe behavior: if callers passed arguments in old inverted style
// (e.g., failure("CODE","message") ), the wrapper returns a payload object instead of
// throwing, so existing misuse patterns won't crash the server. New code should call
// success(res, data) and failure(res, code, message, status).

export const success = <T,>(res: any, data: T, meta?: any) => {
  const payload = { success: true, data, meta } as SovereignResponse<T>;
  if (!isExpressResponse(res)) {
    console.error('[SOVEREIGN_API] success() called with invalid res. Returning payload for backward compatibility.');
    return payload;
  }
  return sovereignSuccess(res, data, meta);
};

export const failure = (res: any, code: string, message: string, status = 400, details: unknown = null) => {
  const payload = { success: false, error: message, meta: { code, details } } as SovereignResponse;
  if (!isExpressResponse(res)) {
    console.error('[SOVEREIGN_API] failure() called with invalid res. Returning payload for backward compatibility.');
    return payload;
  }
  return sovereignFailure(res, message, status, { code, details });
};