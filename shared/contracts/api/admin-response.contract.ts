export interface AdminResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: any;
}

export interface MutationResponse {
  success: boolean;
  id?: number | string;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  totalPages: number;
  totalCount: number;
}
