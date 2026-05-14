/**
 * ============================================
 * API ENDPOINTS REGISTRATION - OpenAPI Auto-Documentation
 * ============================================
 * Register all BharatOS API endpoints with OpenAPI spec
 *
 * This file centralizes all API endpoint documentation
 * and enables automatic Swagger UI generation
 */

import { z } from "zod";
import { registerEndpoint } from "../lib/swagger";
import { loginDTO, registerDTO, refreshTokenDTO } from "../dto/auth.dto";
import { storesQueryDTO, productsQueryDTO, categoriesResponseDTO, storesResponseDTO, productsResponseDTO } from "../dto/marketplace.dto";
import { createOrderDTO, orderResponseDTO, ordersListResponseDTO } from "../dto/order.dto";

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

registerEndpoint({
  method: "post",
  path: "/api/auth/login",
  summary: "User login",
  description: "Authenticate user with username and password",
  tags: ["Authentication"],
  requestBody: {
    content: {
      "application/json": {
        schema: loginDTO,
      },
    },
    required: true,
  },
  responses: {
    "200": {
      description: "Login successful",
    },
    "400": {
      description: "Validation failed",
    },
    "401": {
      description: "Invalid credentials",
    },
  },
});

registerEndpoint({
  method: "post",
  path: "/api/auth/register",
  summary: "User registration",
  description: "Register a new user account",
  tags: ["Authentication"],
  requestBody: {
    content: {
      "application/json": {
        schema: registerDTO,
      },
    },
    required: true,
  },
  responses: {
    "201": {
      description: "Registration successful",
    },
    "400": {
      description: "Validation failed or user already exists",
    },
  },
});

registerEndpoint({
  method: "post",
  path: "/api/auth/refresh",
  summary: "Refresh access token",
  description: "Get new access token using refresh token",
  tags: ["Authentication"],
  requestBody: {
    content: {
      "application/json": {
        schema: refreshTokenDTO,
      },
    },
    required: true,
  },
  responses: {
    "200": {
      description: "Token refreshed successfully",
    },
    "401": {
      description: "Invalid refresh token",
    },
  },
});

registerEndpoint({
  method: "get",
  path: "/api/auth/verify",
  summary: "Verify authentication token",
  description: "Check if current token is valid",
  tags: ["Authentication"],
  security: [{ bearerAuth: [] }],
  responses: {
    "200": {
      description: "Token is valid",
    },
    "401": {
      description: "Token is invalid or expired",
    },
  },
});

registerEndpoint({
  method: "post",
  path: "/api/auth/logout",
  summary: "User logout",
  description: "Invalidate current session",
  tags: ["Authentication"],
  security: [{ bearerAuth: [] }],
  responses: {
    "200": {
      description: "Logged out successfully",
    },
  },
});

// ============================================
// MARKETPLACE ENDPOINTS
// ============================================

registerEndpoint({
  method: "get",
  path: "/api/categories",
  summary: "Get product categories",
  description: "Retrieve all active product categories",
  tags: ["Marketplace"],
  responses: {
    "200": {
      description: "Categories retrieved successfully",
      content: {
        "application/json": {
          schema: categoriesResponseDTO,
        },
      },
    },
  },
});

registerEndpoint({
  method: "get",
  path: "/api/marketplace/stores",
  summary: "Get stores by district",
  description: "Retrieve stores filtered by district with AI ranking",
  tags: ["Marketplace"],
  parameters: [
    {
      name: "district",
      in: "query",
      required: false,
      schema: storesQueryDTO.shape.district,
      description: "District slug or ID to filter stores",
    },
    {
      name: "districtId",
      in: "query",
      required: false,
      schema: storesQueryDTO.shape.districtId,
      description: "District ID to filter stores",
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: storesQueryDTO.shape.limit,
      description: "Maximum number of stores to return",
    },
  ],
  responses: {
    "200": {
      description: "Stores retrieved successfully",
      content: {
        "application/json": {
          schema: storesResponseDTO,
        },
      },
    },
    "400": {
      description: "Invalid query parameters",
    },
  },
});

registerEndpoint({
  method: "get",
  path: "/api/marketplace/products",
  summary: "Get products by district",
  description: "Retrieve products filtered by district and search criteria",
  tags: ["Marketplace"],
  parameters: [
    {
      name: "district",
      in: "query",
      required: false,
      schema: productsQueryDTO.shape.district,
      description: "District slug to filter products",
    },
    {
      name: "category",
      in: "query",
      required: false,
      schema: productsQueryDTO.shape.category,
      description: "Product category filter",
    },
    {
      name: "search",
      in: "query",
      required: false,
      schema: productsQueryDTO.shape.search,
      description: "Search term for product title/description",
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: productsQueryDTO.shape.limit,
      description: "Maximum number of products to return",
    },
    {
      name: "offset",
      in: "query",
      required: false,
      schema: productsQueryDTO.shape.offset,
      description: "Number of products to skip",
    },
  ],
  responses: {
    "200": {
      description: "Products retrieved successfully",
      content: {
        "application/json": {
          schema: productsResponseDTO,
        },
      },
    },
    "400": {
      description: "Invalid query parameters",
    },
  },
});

registerEndpoint({
  method: "get",
  path: "/api/marketplace/products/{id}",
  summary: "Get product details",
  description: "Retrieve detailed information for a specific product",
  tags: ["Marketplace"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()),
      description: "Product ID",
    },
  ],
  responses: {
    "200": {
      description: "Product details retrieved successfully",
    },
    "404": {
      description: "Product not found",
    },
  },
});

// ============================================
// ORDER ENDPOINTS
// ============================================

registerEndpoint({
  method: "post",
  path: "/api/orders",
  summary: "Create new order",
  description: "Place a new order with multiple items",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  requestBody: {
    content: {
      "application/json": {
        schema: createOrderDTO,
      },
    },
    required: true,
  },
  responses: {
    "200": {
      description: "Order created successfully",
      content: {
        "application/json": {
          schema: orderResponseDTO,
        },
      },
    },
    "400": {
      description: "Validation failed or insufficient stock",
    },
    "401": {
      description: "Authentication required",
    },
  },
});

registerEndpoint({
  method: "get",
  path: "/api/orders",
  summary: "Get user orders",
  description: "Retrieve user's order history",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  responses: {
    "200": {
      description: "Orders retrieved successfully",
      content: {
        "application/json": {
          schema: ordersListResponseDTO,
        },
      },
    },
    "401": {
      description: "Authentication required",
    },
  },
});

registerEndpoint({
  method: "get",
  path: "/api/orders/{id}",
  summary: "Get order details",
  description: "Retrieve detailed information for a specific order",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: z.string().min(1),
      description: "Order ID",
    },
  ],
  responses: {
    "200": {
      description: "Order details retrieved successfully",
      content: {
        "application/json": {
          schema: orderResponseDTO,
        },
      },
    },
    "404": {
      description: "Order not found",
    },
  },
});

// ============================================
// PUBLIC ENDPOINTS
// ============================================

registerEndpoint({
  method: "get",
  path: "/api/public/stats",
  summary: "Get platform statistics",
  description: "Retrieve public statistics about the platform",
  tags: ["Public"],
  responses: {
    "200": {
      description: "Statistics retrieved successfully",
    },
  },
});

registerEndpoint({
  method: "get",
  path: "/health",
  summary: "Health check",
  description: "Check if the API is running",
  tags: ["Public"],
  responses: {
    "200": {
      description: "API is healthy",
    },
  },
});

export default {
  // This file just registers endpoints - no exports needed
};