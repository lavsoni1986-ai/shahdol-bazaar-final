import { z } from "zod";
import { registerSchema } from "../lib/swagger";

/**
 * ============================================
 * ORDER DTOs - BharatOS Transaction System
 * ============================================
 * Type-safe validation for order management
 */

// ============================================
// ORDER ITEM DTO
// ============================================
export const orderItemDTO = z.object({
  productId: z.number()
    .int("Product ID must be a whole number")
    .positive("Product ID must be positive"),

  quantity: z.number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(20, "Cannot order more than 20 items"),
});

// ============================================
// CREATE ORDER DTO
// ============================================
export const createOrderDTO = z.object({
  items: z.array(orderItemDTO)
    .min(1, "At least one item is required")
    .max(50, "Cannot order more than 50 different items at once"),

  shippingAddress: z.string()
    .min(10, "Shipping address is required")
    .max(500, "Address must not exceed 500 characters")
    .trim(),

  contactPhone: z.string()
    .regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits")
    .optional(),

  paymentMethod: z.enum(["cash", "online", "card"])
    .default("cash"),

  notes: z.string()
    .max(500, "Notes must not exceed 500 characters")
    .optional()
    .nullable(),
});

// ============================================
// ORDER PARAMS DTO
// ============================================
export const orderParamsDTO = z.object({
  id: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().positive("Invalid order ID")),
});

// ============================================
// ORDER STATUS UPDATE DTO (ADMIN)
// ============================================
export const updateOrderStatusDTO = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED"
  ]),
  notes: z.string()
    .max(500, "Notes must not exceed 500 characters")
    .optional(),
});

// ============================================
// ORDER RESPONSE DTO
// ============================================
export const orderResponseDTO = z.object({
  id: z.string(),
  userId: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  shippingAddress: z.string(),
  contactPhone: z.string().nullable(),
  paymentMethod: z.string(),
  notes: z.string().nullable(),
  items: z.array(z.object({
    id: z.number(),
    productId: z.number(),
    quantity: z.number(),
    price: z.number(),
    product: z.object({
      id: z.number(),
      title: z.string(),
      imageUrl: z.string().nullable(),
      vendor: z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
      }),
    }),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================
// ORDERS LIST RESPONSE DTO
// ============================================
export const ordersListResponseDTO = z.object({
  data: z.array(orderResponseDTO),
  count: z.number(),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// ============================================
// ORDER QUERY DTO
// ============================================
export const ordersQueryDTO = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED"
  ]).optional(),

  limit: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(100).default(20))
    .optional(),

  offset: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(0).default(0))
    .optional(),

  sortBy: z.enum(["createdAt", "totalAmount", "status"])
    .default("createdAt")
    .optional(),

  sortOrder: z.enum(["asc", "desc"])
    .default("desc")
    .optional(),
});

// ============================================
// REGISTER SCHEMAS WITH OPENAPI
// ============================================
registerSchema("CreateOrderDTO", createOrderDTO);
registerSchema("OrderResponseDTO", orderResponseDTO);
registerSchema("OrdersListResponseDTO", ordersListResponseDTO);

// ============================================
// TYPE EXPORTS
// ============================================
export type OrderItemDTO = z.infer<typeof orderItemDTO>;
export type CreateOrderDTO = z.infer<typeof createOrderDTO>;
export type OrderParamsDTO = z.infer<typeof orderParamsDTO>;
export type UpdateOrderStatusDTO = z.infer<typeof updateOrderStatusDTO>;
export type OrderResponseDTO = z.infer<typeof orderResponseDTO>;
export type OrdersListResponseDTO = z.infer<typeof ordersListResponseDTO>;
export type OrdersQueryDTO = z.infer<typeof ordersQueryDTO>;

export default {
  orderItemDTO,
  createOrderDTO,
  orderParamsDTO,
  updateOrderStatusDTO,
  orderResponseDTO,
  ordersListResponseDTO,
  ordersQueryDTO,
};