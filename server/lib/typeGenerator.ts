/**
 * ============================================
 * FRONTEND TYPE SYNC - BharatOS Auto-Type Generation
 * ============================================
 * Generate TypeScript types from Zod schemas for frontend consumption
 *
 * Enables:
 * - Type-safe API calls from frontend
 * - Auto-completion in IDE
 * - Compile-time error detection
 * - Zero mismatch between backend/frontend types
 */

import { z } from "zod";
import fs from "fs";
import path from "path";

// Import all DTOs to generate types from
import * as authDTOs from "../dto/auth.dto";
import * as marketplaceDTOs from "../dto/marketplace.dto";
import * as orderDTOs from "../dto/order.dto";
import * as vendorDTOs from "../dto/vendor.dto";
import * as adminDTOs from "../dto/admin.dto";

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  generateFrontendTypes();
}

/**
 * Generate TypeScript type definitions from Zod schemas
 */
function generateTypes(): string {
  const types: string[] = [];

  // Add header comment
  types.push(`/**
 * ============================================
 * AUTO-GENERATED TYPES - BharatOS Frontend SDK
 * ============================================
 * These types are automatically generated from Zod schemas.
 * DO NOT EDIT MANUALLY - regenerate using: npm run generate-types
 *
 * Generated at: ${new Date().toISOString()}
 */`);

// ============================================
// MARKETPLACE TYPES
// ============================================
  types.push("// ============================================");
  types.push("// MARKETPLACE TYPES");
  types.push("// ============================================");
  types.push("");

  Object.entries(marketplaceDTOs).forEach(([key, schema]) => {
    if (schema instanceof z.ZodType) {
      const typeDef = schema._def.typeName === 'ZodObject' ? generateObjectType(schema) : 'any';
      types.push(`export type ${key} = ${typeDef};`);
    }
  });

  types.push("");

// ============================================
// ORDER TYPES
// ============================================
  types.push("// ============================================");
  types.push("// ORDER TYPES");
  types.push("// ============================================");
  types.push("");

  Object.entries(orderDTOs).forEach(([key, schema]) => {
    if (schema instanceof z.ZodType) {
      const typeDef = schema._def.typeName === 'ZodObject' ? generateObjectType(schema) : 'any';
      types.push(`export type ${key} = ${typeDef};`);
    }
  });

  types.push("");

// ============================================
// VENDOR TYPES
// ============================================
  types.push("// ============================================");
  types.push("// VENDOR TYPES");
  types.push("// ============================================");
  types.push("");

  Object.entries(vendorDTOs).forEach(([key, schema]) => {
    if (schema instanceof z.ZodType) {
      const typeDef = schema._def.typeName === 'ZodObject' ? generateObjectType(schema) : 'any';
      types.push(`export type ${key} = ${typeDef};`);
    }
  });

  types.push("");

// ============================================
// ADMIN TYPES
// ============================================
  types.push("// ============================================");
  types.push("// ADMIN TYPES");
  types.push("// ============================================");
  types.push("");

  Object.entries(adminDTOs).forEach(([key, schema]) => {
    if (schema instanceof z.ZodType) {
      const typeDef = schema._def.typeName === 'ZodObject' ? generateObjectType(schema) : 'any';
      types.push(`export type ${key} = ${typeDef};`);
    }
  });

  types.push("");

// ============================================
// API RESPONSE TYPES
// ============================================
  types.push("// ============================================");
  types.push("// API RESPONSE TYPES");
  types.push("// ============================================");
  types.push("");

  types.push("export interface ApiResponse<T = any> {");
  types.push("  success: boolean;");
  types.push("  data?: T;");
  types.push("  error?: string;");
  types.push("  details?: any;");
  types.push("  meta?: {");
  types.push("    timestamp: string;");
  types.push("    version: string;");
  types.push("    requestId?: string;");
  types.push("  };");
  types.push("}");

  types.push("");
  types.push("export interface ErrorResponse extends ApiResponse<never> {");
  types.push("  success: false;");
  types.push("  error: string;");
  types.push("  details?: any;");
  types.push("}");


  types.push("");

// ============================================
// AI EXPLANATION TYPES
// ============================================
  types.push("// ============================================");
  types.push("// AI EXPLANATION TYPES");
  types.push("// ============================================");
  types.push("");

  types.push("export interface Explanation {");
  types.push("  reason: string;");
  types.push("  confidence: number;");
  types.push("  factors: Array<{");
  types.push("    name: string;");
  types.push("    value: any;");
  types.push("    weight: number;");
  types.push("    impact: 'positive' | 'negative' | 'neutral';");
  types.push("  }>;");
  types.push("  alternatives?: Array<{");
  types.push("    option: string;");
  types.push("    confidence: number;");
  types.push("    reasoning: string;");
  types.push("  }>;");
  types.push("  metadata?: Record<string, any>;");
  types.push("}");

  types.push("");

  types.push("export interface FraudExplanation extends Explanation {");
  types.push("  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';");
  types.push("  signals: {");
  types.push("    anomalyScore: number;");
  types.push("    patternMatches: string[];");
  types.push("    behaviorFlags: string[];");
  types.push("    historicalTrends: string[];");
  types.push("  };");
  types.push("  recommendations: string[];");
  types.push("}");


  types.push("");

  types.push("export interface RecommendationExplanation extends Explanation {");
  types.push("  type: 'vendor' | 'product' | 'category';");
  types.push("  ranking: {");
  types.push("    position: number;");
  types.push("    total: number;");
  types.push("    percentile: number;");
  types.push("  };");
  types.push("  personalization: {");
  types.push("    userProfile: string[];");
  types.push("    contextFactors: string[];");
  types.push("    seasonalTrends: string[];");
  types.push("  };");
  types.push("}");


  return types.join("\n");
}

/**
 * Generate TypeScript type from Zod object schema
 */
function generateObjectType(schema: z.ZodTypeAny): string {
  if (schema._def.typeName !== 'ZodObject') {
    return 'any';
  }

  const shape = schema._def.shape();
  const properties: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const tsType = zodToTypeScript(value as z.ZodTypeAny);
    const isOptional = (value as any)._def.typeName === 'ZodOptional' ||
                      (value as any)._def.typeName === 'ZodDefault';
    properties.push(`  ${key}${isOptional ? '?' : ''}: ${tsType};`);
  }

  return `{\n${properties.join('\n')}\n}`;
}

/**
 * Convert Zod type to TypeScript type string
 */
function zodToTypeScript(schema: z.ZodTypeAny): string {
  const def = schema._def;

  switch (def.typeName) {
    case 'ZodString':
      return 'string';

    case 'ZodNumber':
      return 'number';

    case 'ZodBoolean':
      return 'boolean';

    case 'ZodArray':
      return `${zodToTypeScript(def.type)}[]`;

    case 'ZodOptional':
      return `${zodToTypeScript(def.innerType)} | undefined`;

    case 'ZodNullable':
      return `${zodToTypeScript(def.innerType)} | null`;

    case 'ZodDefault':
      return zodToTypeScript(def.innerType);

    case 'ZodEnum':
      return def.values.map((v: string) => `'${v}'`).join(' | ');

    case 'ZodUnion':
      return def.options.map((opt: z.ZodTypeAny) => zodToTypeScript(opt)).join(' | ');

    case 'ZodObject':
      return generateObjectType(schema);

    case 'ZodLiteral':
      return typeof def.value === 'string' ? `'${def.value}'` : def.value.toString();

    default:
      return 'any';
  }
}

/**
 * Write generated types to file
 */
function writeTypesToFile() {
  const typesContent = generateTypes();
  const outputPath = path.resolve(process.cwd(), 'client/src/types/api.ts');

  console.log(`[TYPE SYNC] Output path: ${outputPath}`);
  console.log(`[TYPE SYNC] Content length: ${typesContent.length}`);

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    console.log(`[TYPE SYNC] Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, typesContent, 'utf-8');
  console.log(`✅ [TYPE SYNC] Generated types at ${outputPath}`);
}

/**
 * Generate API client SDK
 */
function generateApiClient() {
  const clientCode = `/**
 * ============================================
 * AUTO-GENERATED API CLIENT - BharatOS Frontend SDK
 * ============================================
 * Type-safe API client generated from Zod schemas.
 * DO NOT EDIT MANUALLY - regenerate using: npm run generate-types
 *
 * Generated at: ${new Date().toISOString()}
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
    const url = \`\${this.baseURL}\${endpoint}\`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = \`Bearer \${this.token}\`;
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
    return this.request(\`/marketplace/stores\${query}\`);
  }

  async getProducts(params?: ProductsQueryDTO) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(\`/marketplace/products\${query}\`);
  }

  async getProduct(id: string) {
    return this.request(\`/marketplace/products/\${id}\`);
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
    return this.request(\`/orders/\${id}\`);
  }
}

// Export singleton instance
export const apiClient = new BharatOSApiClient();

// Export class for custom instances
export default BharatOSApiClient;
`;

  const clientPath = path.resolve(process.cwd(), 'client/src/lib/apiClient.ts');
  const dir = path.dirname(clientPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(clientPath, clientCode, 'utf-8');
  console.log(`✅ [API CLIENT] Generated type-safe API client at ${clientPath}`);
}

/**
 * Main generation function
 */
export function generateFrontendTypes() {
  console.log("🔄 [TYPE SYNC] STARTING frontend TypeScript types generation from Zod schemas...");

  try {
    console.log("[TYPE SYNC] Starting type generation...");
    writeTypesToFile();
    console.log("[TYPE SYNC] Starting API client generation...");
    generateApiClient();

    console.log("✅ [TYPE SYNC] Frontend type synchronization complete!");
    console.log("🎯 [TYPE SYNC] Run 'npm run dev' in client to see type-safe development");
  } catch (error) {
    console.error("❌ [TYPE SYNC] Failed to generate types:", error);
    process.exit(1);
  }
}

// Run if called directly
console.log(`[TYPE GENERATOR] import.meta.url: ${import.meta.url}`);
console.log(`[TYPE GENERATOR] process.argv[1]: ${process.argv[1]}`);
console.log(`[TYPE GENERATOR] normalized: ${process.argv[1].replace(/\\/g, '/')}`);
console.log(`[TYPE GENERATOR] file:// URL: file://${process.argv[1].replace(/\\/g, '/')}`);
console.log(`[TYPE GENERATOR] Match: ${import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`}`);

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  console.log("🚀 [TYPE GENERATOR] Running generateFrontendTypes...");
  generateFrontendTypes();
} else {
  console.log("🚫 [TYPE GENERATOR] Not running - not called directly");
}

export default {
  generateFrontendTypes,
  generateTypes,
  generateApiClient,
};