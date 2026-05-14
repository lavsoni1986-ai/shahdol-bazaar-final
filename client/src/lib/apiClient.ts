/**
 * ============================================
 * AUTO-GENERATED API CLIENT - BharatOS Frontend SDK
 * ============================================
 * Type-safe API client generated from Zod schemas.
 * DO NOT EDIT MANUALLY - regenerate using: npm run generate-types
 *
 * Generated at: 2026-03-28T21:09:18.872Z
 */

import type {
  LoginDTO,
  RegisterDTO,
  RefreshTokenDTO,
  StoresQueryDTO,
  ProductsQueryDTO,
  CreateOrderDTO,
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
} from './api';

class BharatOSApiClient {
  private baseURL: string;
  private token?: string;

  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  // ============================================
  // AUTH METHODS
  // ============================================

  async login(credentials: LoginDTO) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterDTO) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async refreshToken(refreshToken: RefreshTokenDTO) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(refreshToken),
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // ============================================
  // MARKETPLACE METHODS
  // ============================================

  async getCategories() {
    return this.request('/categories');
  }

  async getStores(params?: StoresQueryDTO) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/marketplace/stores${query}`);
  }

  async getProducts(params?: ProductsQueryDTO) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/marketplace/products${query}`);
  }

  async getProduct(id: string) {
    return this.request(`/marketplace/products/${id}`);
  }

  // ============================================
  // ORDER METHODS
  // ============================================

  async createOrder(orderData: CreateOrderDTO) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }
}

// Export singleton instance
export const apiClient = new BharatOSApiClient();

// Export class for custom instances
export default BharatOSApiClient;
