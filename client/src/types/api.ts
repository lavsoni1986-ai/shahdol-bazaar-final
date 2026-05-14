/**
 * ============================================
 * AUTO-GENERATED TYPES - BharatOS Frontend SDK
 * ============================================
 * These types are automatically generated from Zod schemas.
 * DO NOT EDIT MANUALLY - regenerate using: npm run generate-types
 *
 * Generated at: 2026-03-28T21:09:18.870Z
 */
// ============================================
// MARKETPLACE TYPES
// ============================================

export type categoriesResponseDTO = {
  data: {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
}[];
  count: number;
};
export type productDetailResponseDTO = {
  id: number;
  title: string;
  name: string | null;
  description: string | null;
  price: number;
  mrp: number | null;
  imageUrl: string | null;
  images: string[];
  category: string;
  stock: number;
  vendorId: number;
  vendor: {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  address: string | null;
  phone: string | null;
  isVerified: boolean;
  dsslScore: number;
  avgRating: number | null;
  totalReviews: number | null;
};
  dsslScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type productParamsDTO = {
  id: any;
};
export type productsQueryDTO = {
  district?: string | undefined;
  districtId?: string | undefined;
  category?: string | undefined;
  search?: string | undefined;
  limit?: any | undefined;
  offset?: any | undefined;
  sortBy?: 'price' | 'rating' | 'newest' | 'popularity' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  minPrice?: any | undefined;
  maxPrice?: any | undefined;
};
export type productsResponseDTO = {
  data: {
  id: number;
  title: string;
  name: string | null;
  description: string | null;
  price: number;
  mrp: number | null;
  imageUrl: string | null;
  category: string;
  stock: number;
  vendorId: number;
  vendor: {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  dsslScore: number;
  avgRating: number | null;
};
  dsslScore: number;
  relevanceScore: number;
}[];
  count: number;
  total?: number | undefined;
};
export type storeDetailResponseDTO = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  images: string[];
  address: string | null;
  phone: string | null;
  mobile: string | null;
  isVerified: boolean;
  dsslScore: number;
  avgRating: number | null;
  totalReviews: number | null;
  status: string;
  businessType: string;
  category: string | null;
  districtId: number | null;
  products: {
  id: number;
  title: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  dsslScore: number;
}[];
  createdAt: string;
  updatedAt: string;
};
export type storeParamsDTO = {
  slug: string;
};
export type storesQueryDTO = {
  district?: string | undefined;
  districtId?: string | undefined;
  limit?: any | undefined;
  category?: string | undefined;
  search?: string | undefined;
};
export type storesResponseDTO = {
  data: {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  address: string | null;
  phone: string | null;
  isVerified: boolean;
  dsslScore: number;
  avgRating: number | null;
  totalReviews: number | null;
  status: string;
  businessType: string;
  category: string | null;
  districtId: number | null;
}[];
  count: number;
};

// ============================================
// ORDER TYPES
// ============================================

export type createOrderDTO = {
  items: {
  productId: number;
  quantity: number;
}[];
  shippingAddress: string;
  contactPhone?: string | undefined;
  paymentMethod?: 'cash' | 'online' | 'card';
  notes: string | undefined | null;
};
export type orderItemDTO = {
  productId: number;
  quantity: number;
};
export type orderParamsDTO = {
  id: any;
};
export type orderResponseDTO = {
  id: string;
  userId: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  contactPhone: string | null;
  paymentMethod: string;
  notes: string | null;
  items: {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  product: {
  id: number;
  title: string;
  imageUrl: string | null;
  vendor: {
  id: number;
  name: string;
  slug: string;
};
};
}[];
  createdAt: string;
  updatedAt: string;
};
export type ordersListResponseDTO = {
  data: {
  id: string;
  userId: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  contactPhone: string | null;
  paymentMethod: string;
  notes: string | null;
  items: {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  product: {
  id: number;
  title: string;
  imageUrl: string | null;
  vendor: {
  id: number;
  name: string;
  slug: string;
};
};
}[];
  createdAt: string;
  updatedAt: string;
}[];
  count: number;
  total: number;
  page: number;
  limit: number;
};
export type ordersQueryDTO = {
  status?: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | undefined;
  limit?: any | undefined;
  offset?: any | undefined;
  sortBy?: 'createdAt' | 'totalAmount' | 'status' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
};
export type updateOrderStatusDTO = {
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  notes?: string | undefined;
};

// ============================================
// VENDOR TYPES
// ============================================

export type createVendorDTO = {
  name: string;
  description: string | undefined | null;
  address: string;
  phone: string;
  category: string;
  mapsLink: string | undefined | null;
  type?: 'SHOP' | 'MARKET' | 'ONLINE';
  businessHours?: string | undefined;
  specialties?: string[] | undefined;
  serviceArea?: string | undefined;
};
export type updateVendorDTO = {
  name?: string | undefined;
  description?: string | undefined | null | undefined;
  address?: string | undefined;
  phone?: string | undefined;
  category?: string | undefined;
  mapsLink?: string | undefined | null | undefined;
  type?: 'SHOP' | 'MARKET' | 'ONLINE' | undefined;
  businessHours?: string | undefined | undefined;
  specialties?: string[] | undefined | undefined;
  serviceArea?: string | undefined | undefined;
};
export type updateVendorStatusDTO = {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'RESTRICTED' | 'MONITORED' | 'BANNED';
  rejectionReason?: string | undefined;
  adminNotes?: string | undefined;
};
export type vendorDashboardStatsDTO = {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
  dsslScore: number;
  customerRating: number | null;
  totalReviews: number;
  monthlyStats: {
  month: string;
  orders: number;
  revenue: number;
}[];
};
export type vendorParamsDTO = {
  id: any;
};
export type vendorResponseDTO = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  images: string[];
  address: string | null;
  phone: string | null;
  mobile: string | null;
  isVerified: boolean;
  dsslScore: number;
  avgRating: number | null;
  totalReviews: number | null;
  status: string;
  businessType: string;
  category: string | null;
  districtId: number | null;
  mapsLink: string | null;
  businessHours: string | null;
  specialties: string[];
  serviceArea: string | null;
  createdAt: string;
  updatedAt: string;
};
export type vendorsListResponseDTO = {
  data: {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  images: string[];
  address: string | null;
  phone: string | null;
  mobile: string | null;
  isVerified: boolean;
  dsslScore: number;
  avgRating: number | null;
  totalReviews: number | null;
  status: string;
  businessType: string;
  category: string | null;
  districtId: number | null;
  mapsLink: string | null;
  businessHours: string | null;
  specialties: string[];
  serviceArea: string | null;
  createdAt: string;
  updatedAt: string;
}[];
  count: number;
  total: number;
  page: number;
  limit: number;
};
export type vendorsQueryDTO = {
  district?: string | undefined;
  districtId?: string | undefined;
  category?: string | undefined;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'RESTRICTED' | 'MONITORED' | 'BANNED' | undefined;
  search?: string | undefined;
  limit?: any | undefined;
  offset?: any | undefined;
  sortBy?: 'name' | 'createdAt' | 'dsslScore' | 'rating' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
};

// ============================================
// ADMIN TYPES
// ============================================

export type adminLoginDTO = {
  username: string;
  password: string;
};
export type analyticsQueryDTO = {
  districtId: any;
  startDate?: string | undefined;
  endDate?: string | undefined;
  metrics?: 'orders' | 'revenue' | 'users' | 'vendors' | 'products' | 'dssl_score' | 'fraud_incidents' | 'performance'[] | undefined;
  groupBy?: 'day' | 'week' | 'month' | 'year' | undefined;
  limit?: any | undefined;
};
export type auditLogQueryDTO = {
  adminId: any;
  action?: string | undefined;
  targetId: any;
  startDate?: string | undefined;
  endDate?: string | undefined;
  limit?: any | undefined;
  offset?: any | undefined;
};
export type createDistrictDTO = {
  name: string;
  slug: string;
  state: string;
  isActive?: boolean;
  primaryColor?: string | undefined;
  secondaryColor?: string | undefined;
  logoUrl?: string | undefined;
  faviconUrl?: string | undefined;
};
export type dashboardStatsDTO = {
  overview: {
  totalUsers: number;
  totalVendors: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
};
  recentActivity: {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  user?: string | undefined;
}[];
  alerts: {
  id: number;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
}[];
  performance: {
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  responseTime: number;
  uptime: number;
  errorRate: number;
};
};
export type fraudActionDTO = {
  vendorId: number;
  action: 'warn' | 'restrict' | 'suspend' | 'ban';
  reason: string;
  duration?: number | undefined;
};
export type orderStatusUpdateDTO = {
  orderId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  notes?: string | undefined;
};
export type productApprovalDTO = {
  productId: number;
  action: 'approve' | 'reject';
  reason?: string | undefined;
};
export type systemConfigDTO = {
  districtId: number;
  config: {
  features?: any | undefined;
  limits?: {
  maxProductsPerVendor?: number | undefined;
  maxOrdersPerDay?: number | undefined;
  maxRevenuePerDay?: number | undefined;
} | undefined;
  rules?: {
  autoApproveVendors?: boolean | undefined;
  autoApproveProducts?: boolean | undefined;
  requireVerification?: boolean | undefined;
} | undefined;
};
};
export type vendorApprovalDTO = {
  vendorId: number;
  action: 'approve' | 'reject' | 'suspend';
  reason?: string | undefined;
  adminNotes?: string | undefined;
};

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    page?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  data: never;
  error: string;
}

// ============================================
// AI EXPLANATION TYPES
// ============================================

export interface Explanation {
  reason: string;
  confidence: number;
  factors: Array<{
    name: string;
    value: any;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  alternatives?: Array<{
    option: string;
    confidence: number;
    reasoning: string;
  }>;
  metadata?: Record<string, any>;
}

export interface FraudExplanation extends Explanation {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: {
    anomalyScore: number;
    patternMatches: string[];
    behaviorFlags: string[];
    historicalTrends: string[];
  };
  recommendations: string[];
}

export interface RecommendationExplanation extends Explanation {
  type: 'vendor' | 'product' | 'category';
  ranking: {
    position: number;
    total: number;
    percentile: number;
  };
  personalization: {
    userProfile: string[];
    contextFactors: string[];
    seasonalTrends: string[];
  };
}
