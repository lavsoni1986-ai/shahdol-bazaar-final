import { Request } from 'express';
import { prisma } from '../storage.js';

/**
 * ============================================
 * AUDIT LOGGER SERVICE
 * ============================================
 * PHASE 2 - Security & Compliance
 * 
 * Tracks all admin actions and security-relevant events
 * for compliance and debugging purposes.
 * 
 * Logged events:
 * - Authentication (login, logout, failed attempts)
 * - CRUD operations on entities
 * - Admin actions
 * - Security events
 */

// ============================================
// TYPES
// ============================================

/**
 * Audit action types
 */
export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // CRUD Operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  
  // Admin Actions
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  
  // Payment & Transactions
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_VERIFIED = 'WEBHOOK_VERIFIED',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',
  
  // Vendor Management
  VENDOR_STATUS_CHANGE = 'VENDOR_STATUS_CHANGE',
  VENDOR_APPROVED = 'VENDOR_APPROVED',
  VENDOR_REJECTED = 'VENDOR_REJECTED',
  VENDOR_SUSPENDED = 'VENDOR_SUSPENDED',
  
  // Multi-tenancy
  DISTRICT_SWITCH = 'DISTRICT_SWITCH',
  CROSS_TENANT_ATTEMPT = 'CROSS_TENANT_ATTEMPT',
  
  // Security
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  ACCESS_DENIED = 'ACCESS_DENIED',
  CROSS_TENANT_ACCESS = 'CROSS_TENANT_ACCESS',
}

/**
 * Entity types for auditing
 */
export enum AuditEntity {
  USER = 'USER',
  VENDOR = 'VENDOR',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  INQUIRY = 'INQUIRY',
  DISTRICT = 'DISTRICT',
  CATEGORY = 'CATEGORY',
  BANNER = 'BANNER',
  BUS_TIMETABLE = 'BUS_TIMETABLE',
  SETTINGS = 'SETTINGS',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | number;
  userId?: number;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  districtId?: number;
  metadata?: Record<string, unknown>;
  description?: string;
  status?: 'success' | 'failure';
}

/**
 * Audit log creation data
 */
export interface CreateAuditLogData {
  action: string;
  entity: string;
  entityId?: string | number;
  userId?: number;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  districtId?: number;
  metadata?: Record<string, unknown>;
  description?: string;
  status?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract client info from request
 */
function extractClientInfo(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  // Get IP from various headers (proxy support)
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded 
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress 
    || 'unknown';
  
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  return { ipAddress: ip, userAgent };
}

/**
 * Get current timestamp
 */
function getTimestamp(): Date {
  return new Date();
}

// ============================================
// CORE LOGGING FUNCTIONS
// ============================================

/**
 * Create an audit log entry
 * 
 * @param data - Audit log data
 * @returns Created audit log or null on error
 * 
 * @example
 * await logAudit({
 *   action: AuditAction.CREATE,
 *   entity: AuditEntity.PRODUCT,
 *   entityId: 123,
 *   userId: 1,
 *   username: 'admin',
 *   description: 'Created new product: Test Product'
 * });
 */
export async function logAudit(data: CreateAuditLogData): Promise<void> {
  try {
    // For now, we'll log to console
    // The AuditLog model will be added to Prisma schema
    const logEntry = {
      timestamp: getTimestamp().toISOString(),
      action: data.action,
      entity: data.entity,
      entityId: data.entityId?.toString(),
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      districtId: data.districtId,
      metadata: data.metadata,
      description: data.description,
      status: data.status,
    };
    
    
    console.log('📝 [AUDIT]', JSON.stringify(logEntry));
    
    // Structured logging for production monitoring
    if (process.env.NODE_ENV === 'production') {
      // In production, also log to a structured format for SIEM/log aggregation
      console.log('AUDIT:', JSON.stringify({
        timestamp: logEntry.timestamp,
        action: logEntry.action,
        entity: logEntry.entity,
        entityId: logEntry.entityId,
        userId: logEntry.userId,
        status: logEntry.status,
        ipAddress: logEntry.ipAddress,
      }));
    }
    
    // TODO: Uncomment when AuditLog model is added to schema
    // await prisma.auditLog.create({
    //   data: {
    //     action: data.action,
    //     entity: data.entity,
    //     entityId: data.entityId?.toString(),
    //     userId: data.userId,
    //     username: data.username,
    //     ipAddress: data.ipAddress,
    //     userAgent: data.userAgent,
    //     districtId: data.districtId,
    //     metadata: data.metadata as any,
    //     description: data.description,
    //     status: data.status,
    //   }
    // });
  } catch (error) {
    console.error('❌ [AUDIT] Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Log authentication event
 * 
 * @param req - Express request
 * @param action - Login, logout, failed login
 * @param userId - User ID if authenticated
 * @param username - Username
 * @param status - success or failure
 * @param metadata - Additional data
 */
export async function logAuthEvent(
  req: Request,
  action: AuditAction.LOGIN | AuditAction.LOGIN_FAILED | AuditAction.LOGOUT,
  userId?: number,
  username?: string,
  status: 'success' | 'failure' = 'success',
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action,
    entity: AuditEntity.USER,
    entityId: userId,
    userId,
    username,
    ipAddress,
    userAgent,
    status,
    description: `${action} - ${username || 'anonymous'} - ${status}`,
    metadata,
  });
}

/**
 * Log login event
 */
export async function logLogin(
  req: Request,
  userId: number,
  username: string
): Promise<void> {
  await logAuthEvent(req, AuditAction.LOGIN, userId, username, 'success');
}

/**
 * Log login failure
 */
export async function logLoginFailed(
  req: Request,
  username: string,
  reason?: string
): Promise<void> {
  await logAuthEvent(
    req, 
    AuditAction.LOGIN_FAILED, 
    undefined, 
    username, 
    'failure',
    { reason }
  );
}

/**
 * Log logout event
 */
export async function logLogout(
  req: Request,
  userId: number,
  username: string
): Promise<void> {
  await logAuthEvent(req, AuditAction.LOGOUT, userId, username, 'success');
}

/**
 * Log entity creation
 */
export async function logCreate(
  req: Request,
  entity: AuditEntity,
  entityId: string | number,
  userId: number,
  username: string,
  description: string,
  districtId?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action: AuditAction.CREATE,
    entity,
    entityId,
    userId,
    username,
    ipAddress,
    userAgent,
    districtId,
    description,
    status: 'success',
    metadata,
  });
}

/**
 * Log entity update
 */
export async function logUpdate(
  req: Request,
  entity: AuditEntity,
  entityId: string | number,
  userId: number,
  username: string,
  description: string,
  changes?: Record<string, unknown>,
  districtId?: number
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action: AuditAction.UPDATE,
    entity,
    entityId,
    userId,
    username,
    ipAddress,
    userAgent,
    districtId,
    description,
    status: 'success',
    metadata: { changes },
  });
}

/**
 * Log entity deletion
 */
export async function logDelete(
  req: Request,
  entity: AuditEntity,
  entityId: string | number,
  userId: number,
  username: string,
  description: string,
  districtId?: number
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action: AuditAction.DELETE,
    entity,
    entityId,
    userId,
    username,
    ipAddress,
    userAgent,
    districtId,
    description,
    status: 'success',
  });
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  req: Request,
  action: AuditAction,
  userId?: number,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action,
    entity: AuditEntity.SETTINGS,
    userId,
    ipAddress,
    userAgent,
    description,
    status: 'failure',
    metadata,
  });
}

export async function logPaymentEvent(
  req: Request,
  action: AuditAction.PAYMENT_SUCCESS | AuditAction.PAYMENT_FAILED | AuditAction.PAYMENT_REFUNDED,
  paymentId: string,
  amount: number,
  userId?: number,
  status: 'success' | 'failure' = 'success',
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action,
    entity: AuditEntity.ORDER,
    entityId: paymentId,
    userId,
    ipAddress,
    userAgent,
    description: `Payment ${action}: ₹${amount} - ${status}`,
    status,
    metadata: {
      amount,
      paymentId,
      ...metadata,
    },
  });
}

/**
 * Log webhook event
 */
export async function logWebhookEvent(
  req: Request,
  provider: string,
  eventType: string,
  eventId: string,
  verified: boolean,
  status: 'success' | 'failure' = 'success',
  error?: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action: verified ? AuditAction.WEBHOOK_VERIFIED : AuditAction.WEBHOOK_FAILED,
    entity: AuditEntity.SETTINGS,
    entityId: eventId,
    ipAddress,
    userAgent,
    description: `Webhook ${provider}: ${eventType} - ${verified ? 'verified' : 'failed'}`,
    status: verified ? 'success' : 'failure',
    metadata: {
      provider,
      eventType,
      eventId,
      error,
    },
  });
}

/**
 * Log vendor status change
 */
export async function logVendorStatusChange(
  req: Request,
  vendorId: number,
  oldStatus: string,
  newStatus: string,
  userId: number,
  username: string,
  districtId?: number
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action: AuditAction.VENDOR_STATUS_CHANGE,
    entity: AuditEntity.VENDOR,
    entityId: vendorId,
    userId,
    username,
    ipAddress,
    userAgent,
    districtId,
    description: `Vendor ${vendorId} status changed: ${oldStatus} -> ${newStatus}`,
    status: 'success',
    metadata: {
      oldStatus,
      newStatus,
    },
  });
}

/**
 * Log district context switch
 */
export async function logDistrictSwitch(
  req: Request,
  userId: number,
  fromDistrictId?: number,
  toDistrictId?: number,
  success: boolean = true
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action: AuditAction.DISTRICT_SWITCH,
    entity: AuditEntity.DISTRICT,
    userId,
    ipAddress,
    userAgent,
    districtId: toDistrictId,
    description: `District switch: ${fromDistrictId || 'none'} -> ${toDistrictId || 'none'}`,
    status: success ? 'success' : 'failure',
    metadata: {
      fromDistrictId,
      toDistrictId,
    },
  });
}

/**
 * Log access denied / cross-tenant attempt
 */
export async function logAccessDenied(
  req: Request,
  action: AuditAction.ACCESS_DENIED | AuditAction.CROSS_TENANT_ACCESS,
  userId: number,
  reason: string,
  requestedResource?: string,
  districtId?: number
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action,
    entity: AuditEntity.SETTINGS,
    userId,
    ipAddress,
    userAgent,
    districtId,
    description: reason,
    status: 'failure',
    metadata: {
      reason,
      requestedResource,
    },
  });
}

/**
 * Log admin action (approve, reject, etc.)
 */
export async function logAdminAction(
  req: Request,
  action: AuditAction,
  entity: AuditEntity,
  entityId: string | number,
  userId: number,
  username: string,
  description: string,
  districtId?: number
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(req);
  
  await logAudit({
    action,
    entity,
    entityId,
    userId,
    username,
    ipAddress,
    userAgent,
    districtId,
    description,
    status: 'success',
  });
}

// ============================================
// EXPORTS
// ============================================

export default {
  logAudit,
  logAuthEvent,
  logLogin,
  logLoginFailed,
  logLogout,
  logCreate,
  logUpdate,
  logDelete,
  logSecurityEvent,
  logAdminAction,
  logPaymentEvent,
  logWebhookEvent,
  logVendorStatusChange,
  logDistrictSwitch,
  logAccessDenied,
  AuditAction,
  AuditEntity,
};
