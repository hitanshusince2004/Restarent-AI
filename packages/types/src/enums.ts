// =============================================================================
// Restaurant OS — Shared Domain Enums
// =============================================================================

// ─────────────────────────────────────────────
// User & RBAC
// ─────────────────────────────────────────────

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum SystemRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  KITCHEN = 'KITCHEN',
  CASHIER = 'CASHIER',
}

export enum Permission {
  // Restaurant
  RESTAURANT_READ = 'restaurant.read',
  RESTAURANT_UPDATE = 'restaurant.update',

  // Outlet
  OUTLET_READ = 'outlet.read',
  OUTLET_CREATE = 'outlet.create',
  OUTLET_UPDATE = 'outlet.update',
  OUTLET_DELETE = 'outlet.delete',

  // Tables
  TABLE_READ = 'table.read',
  TABLE_CREATE = 'table.create',
  TABLE_UPDATE = 'table.update',
  TABLE_DELETE = 'table.delete',

  // QR
  QR_READ = 'qr.read',
  QR_GENERATE = 'qr.generate',
  QR_REVOKE = 'qr.revoke',

  // Menu
  MENU_READ = 'menu.read',
  MENU_CREATE = 'menu.create',
  MENU_UPDATE = 'menu.update',
  MENU_DELETE = 'menu.delete',
  MENU_PUBLISH = 'menu.publish',

  // Menu Import
  MENU_IMPORT_CREATE = 'menu_import.create',
  MENU_IMPORT_REVIEW = 'menu_import.review',

  // Orders
  ORDERS_READ = 'orders.read',
  ORDERS_CREATE = 'orders.create',
  ORDERS_UPDATE = 'orders.update',
  ORDERS_CANCEL = 'orders.cancel',

  // Kitchen
  KITCHEN_READ = 'kitchen.read',
  KITCHEN_UPDATE = 'kitchen.update',

  // Billing
  BILLING_READ = 'billing.read',
  BILLING_UPDATE = 'billing.update',
  PAYMENT_CREATE = 'payment.create',

  // Staff
  STAFF_READ = 'staff.read',
  STAFF_MANAGE = 'staff.manage',

  // Reports
  REPORTS_READ = 'reports.read',

  // Settings
  SETTINGS_MANAGE = 'settings.manage',

  // Customers
  CUSTOMERS_READ = 'customers.read',

  // Audit
  AUDIT_READ = 'audit.read',
}

// ─────────────────────────────────────────────
// Restaurant
// ─────────────────────────────────────────────

export enum RestaurantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum OutletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TEMPORARILY_CLOSED = 'TEMPORARILY_CLOSED',
}

// ─────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  INACTIVE = 'INACTIVE',
}

export enum TableShape {
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
}

// ─────────────────────────────────────────────
// QR Code
// ─────────────────────────────────────────────

export enum QrCodeStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

// ─────────────────────────────────────────────
// Table Session
// ─────────────────────────────────────────────

export enum TableSessionStatus {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  BILLING = 'BILLING',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

// ─────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────

export enum MenuItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum FoodType {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
  EGG = 'EGG',
  VEGAN = 'VEGAN',
  CONTAINS_ALCOHOL = 'CONTAINS_ALCOHOL',
}

export enum SpiceLevel {
  NONE = 'NONE',
  MILD = 'MILD',
  MEDIUM = 'MEDIUM',
  HOT = 'HOT',
  EXTRA_HOT = 'EXTRA_HOT',
}

export enum ModifierSelectionType {
  SINGLE = 'SINGLE',
  MULTIPLE = 'MULTIPLE',
}

// ─────────────────────────────────────────────
// AI Menu Import
// ─────────────────────────────────────────────

export enum MenuImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  EXTRACTION_COMPLETE = 'EXTRACTION_COMPLETE',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum MenuImportItemStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
}

export enum AiProvider {
  TESSERACT = 'TESSERACT',
  OLLAMA = 'OLLAMA',
  NONE = 'NONE',
}

// ─────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Valid status transitions for an order.
 * Staff/system may only move to these next states.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.SERVED],
  [OrderStatus.SERVED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export enum OrderEventType {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ITEM_ADDED = 'ITEM_ADDED',
  ITEM_REMOVED = 'ITEM_REMOVED',
  CANCELLED = 'CANCELLED',
  NOTE_ADDED = 'NOTE_ADDED',
}

// ─────────────────────────────────────────────
// Kitchen
// ─────────────────────────────────────────────

export enum KitchenTicketStatus {
  NEW = 'NEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
}

export const KITCHEN_TICKET_TRANSITIONS: Record<KitchenTicketStatus, KitchenTicketStatus[]> = {
  [KitchenTicketStatus.NEW]: [KitchenTicketStatus.ACKNOWLEDGED, KitchenTicketStatus.PREPARING],
  [KitchenTicketStatus.ACKNOWLEDGED]: [KitchenTicketStatus.PREPARING],
  [KitchenTicketStatus.PREPARING]: [KitchenTicketStatus.READY],
  [KitchenTicketStatus.READY]: [KitchenTicketStatus.COMPLETED],
  [KitchenTicketStatus.COMPLETED]: [],
};

// ─────────────────────────────────────────────
// Bill
// ─────────────────────────────────────────────

export enum BillStatus {
  OPEN = 'OPEN',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  VOID = 'VOID',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum TaxType {
  CGST = 'CGST',
  SGST = 'SGST',
  IGST = 'IGST',
  CESS = 'CESS',
}

// ─────────────────────────────────────────────
// Payment
// ─────────────────────────────────────────────

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  ONLINE_GATEWAY = 'ONLINE_GATEWAY',
  COMPLIMENTARY = 'COMPLIMENTARY',
}

export enum PaymentProvider {
  MANUAL = 'manual',
  RAZORPAY = 'razorpay',
}

// ─────────────────────────────────────────────
// Notification
// ─────────────────────────────────────────────

export enum NotificationType {
  ORDER_RECEIVED = 'ORDER_RECEIVED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_READY = 'ORDER_READY',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  TABLE_SESSION_OPENED = 'TABLE_SESSION_OPENED',
  TABLE_SESSION_CLOSED = 'TABLE_SESSION_CLOSED',
  LOW_STOCK = 'LOW_STOCK',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  WEBSOCKET = 'WEBSOCKET',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

// ─────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────

export enum AuditAction {
  // Menu
  MENU_ITEM_CREATED = 'MENU_ITEM_CREATED',
  MENU_ITEM_UPDATED = 'MENU_ITEM_UPDATED',
  MENU_ITEM_DELETED = 'MENU_ITEM_DELETED',
  MENU_ITEM_PRICE_CHANGED = 'MENU_ITEM_PRICE_CHANGED',
  MENU_PUBLISHED = 'MENU_PUBLISHED',

  // Order
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',

  // Bill
  BILL_CREATED = 'BILL_CREATED',
  BILL_MODIFIED = 'BILL_MODIFIED',
  DISCOUNT_APPLIED = 'DISCOUNT_APPLIED',

  // Payment
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_MARKED_COMPLETE = 'PAYMENT_MARKED_COMPLETE',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Staff
  STAFF_INVITED = 'STAFF_INVITED',
  STAFF_ROLE_CHANGED = 'STAFF_ROLE_CHANGED',
  STAFF_REMOVED = 'STAFF_REMOVED',

  // Restaurant
  RESTAURANT_SETTINGS_CHANGED = 'RESTAURANT_SETTINGS_CHANGED',
  OUTLET_CREATED = 'OUTLET_CREATED',
  TABLE_CREATED = 'TABLE_CREATED',
  QR_REVOKED = 'QR_REVOKED',
  QR_REGENERATED = 'QR_REGENERATED',

  // Session
  TABLE_SESSION_OPENED = 'TABLE_SESSION_OPENED',
  TABLE_SESSION_CLOSED = 'TABLE_SESSION_CLOSED',

  // Auth
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

// ─────────────────────────────────────────────
// Files
// ─────────────────────────────────────────────

export enum FileCategory {
  MENU_IMAGE = 'MENU_IMAGE',
  RESTAURANT_LOGO = 'RESTAURANT_LOGO',
  MENU_ITEM_IMAGE = 'MENU_ITEM_IMAGE',
  DOCUMENT = 'DOCUMENT',
}

export enum FileStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

// ─────────────────────────────────────────────
// AI Jobs
// ─────────────────────────────────────────────

export enum AiJobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AiJobType {
  MENU_IMPORT_OCR = 'MENU_IMPORT_OCR',
  MENU_IMPORT_PARSE = 'MENU_IMPORT_PARSE',
}

// ─────────────────────────────────────────────
// WebSocket Events
// ─────────────────────────────────────────────

export enum SocketEvent {
  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_ACCEPTED = 'order.accepted',
  ORDER_PREPARING = 'order.preparing',
  ORDER_READY = 'order.ready',
  ORDER_SERVED = 'order.served',
  ORDER_COMPLETED = 'order.completed',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_STATUS_CHANGED = 'order.status_changed',

  // Table session events
  TABLE_SESSION_OPENED = 'table.session.opened',
  TABLE_SESSION_UPDATED = 'table.session.updated',
  TABLE_SESSION_CLOSED = 'table.session.closed',

  // Kitchen events
  KITCHEN_TICKET_CREATED = 'kitchen.ticket.created',
  KITCHEN_TICKET_UPDATED = 'kitchen.ticket.updated',

  // Bill events
  BILL_UPDATED = 'bill.updated',

  // Payment events
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_UPDATED = 'payment.updated',

  // Menu events
  MENU_UPDATED = 'menu.updated',

  // Notification events
  NOTIFICATION_CREATED = 'notification.created',

  // Connection events
  JOIN_RESTAURANT = 'join.restaurant',
  JOIN_TABLE_SESSION = 'join.table_session',
  LEAVE_RESTAURANT = 'leave.restaurant',
}

// ─────────────────────────────────────────────
// API Response
// ─────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────
// Currency
// ─────────────────────────────────────────────

export const DEFAULT_CURRENCY = 'INR';

export enum GstSlab {
  ZERO = 0,
  FIVE = 5,
  TWELVE = 12,
  EIGHTEEN = 18,
  TWENTY_EIGHT = 28,
}
