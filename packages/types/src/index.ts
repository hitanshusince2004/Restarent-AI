// =============================================================================
// Restaurant OS — Shared Domain Interfaces
// =============================================================================

export * from './enums';

// ─────────────────────────────────────────────
// Timestamp mixin
// ─────────────────────────────────────────────
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable {
  deletedAt: Date | null;
}

// ─────────────────────────────────────────────
// User
// ─────────────────────────────────────────────

export interface IUser extends Timestamps {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: import('./enums').UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
}

// ─────────────────────────────────────────────
// Restaurant
// ─────────────────────────────────────────────

export interface IRestaurant extends Timestamps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pincode: string | null;
  currency: string;
  status: import('./enums').RestaurantStatus;
  defaultTaxRate: number;
  gstNumber: string | null;
  fssaiNumber: string | null;
}

export interface IOutlet extends Timestamps {
  id: string;
  restaurantId: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: import('./enums').OutletStatus;
  openingTime: string | null;
  closingTime: string | null;
  isCurrentlyOpen: boolean;
}

export interface IFloor extends Timestamps {
  id: string;
  outletId: string;
  name: string;
  displayOrder: number;
}

export interface ITable extends Timestamps {
  id: string;
  outletId: string;
  floorId: string | null;
  name: string;
  capacity: number;
  status: import('./enums').TableStatus;
  shape: import('./enums').TableShape;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
}

export interface ITableQrCode extends Timestamps {
  id: string;
  tableId: string;
  token: string;
  status: import('./enums').QrCodeStatus;
  revokedAt: Date | null;
  qrImageUrl: string | null;
}

// ─────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────

export interface IMenuCategory extends Timestamps {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface IMenuItem extends Timestamps, SoftDeletable {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: string; // Decimal stored as string to avoid float issues
  foodType: import('./enums').FoodType;
  spiceLevel: import('./enums').SpiceLevel | null;
  preparationTimeMinutes: number | null;
  calories: number | null;
  isRecommended: boolean;
  status: import('./enums').MenuItemStatus;
  displayOrder: number;
  taxRate: number;
  hsnCode: string | null;
}

export interface IMenuItemVariant extends Timestamps {
  id: string;
  menuItemId: string;
  name: string;
  price: string; // Decimal as string
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface IMenuModifierGroup extends Timestamps {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  selectionType: import('./enums').ModifierSelectionType;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
}

export interface IMenuModifierOption extends Timestamps {
  id: string;
  modifierGroupId: string;
  name: string;
  additionalPrice: string; // Decimal as string
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
}

// ─────────────────────────────────────────────
// Customer
// ─────────────────────────────────────────────

export interface ICustomer extends Timestamps {
  id: string;
  restaurantId: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  isAnonymous: boolean;
  visitCount: number;
  totalSpend: string; // Decimal as string
}

// ─────────────────────────────────────────────
// Table Session
// ─────────────────────────────────────────────

export interface ITableSession extends Timestamps {
  id: string;
  tableId: string;
  outletId: string;
  restaurantId: string;
  status: import('./enums').TableSessionStatus;
  guestCount: number | null;
  openedAt: Date;
  closedAt: Date | null;
  billId: string | null;
}

// ─────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────

export interface IOrderItemModifierSnapshot {
  modifierOptionId: string;
  modifierGroupId: string;
  optionName: string;
  groupName: string;
  additionalPrice: string; // Decimal snapshot
}

export interface IOrderItem extends Timestamps {
  id: string;
  orderId: string;
  menuItemId: string;
  variantId: string | null;

  // Price snapshots — immutable after creation
  itemName: string;
  variantName: string | null;
  unitPrice: string; // Decimal snapshot
  taxRate: number; // snapshot
  quantity: number;
  notes: string | null;

  lineTotal: string; // Decimal: unitPrice * quantity (before tax)
  lineTax: string; // Decimal: tax amount
  lineGrandTotal: string; // Decimal: lineTotal + lineTax
}

export interface IOrder extends Timestamps {
  id: string;
  orderNumber: string;
  tableSessionId: string;
  tableId: string;
  outletId: string;
  restaurantId: string;
  customerId: string | null;

  status: import('./enums').OrderStatus;
  notes: string | null;
  idempotencyKey: string;

  // Financial totals — calculated by backend, immutable after completion
  subtotal: string; // Decimal
  taxTotal: string; // Decimal
  grandTotal: string; // Decimal

  acceptedAt: Date | null;
  preparedAt: Date | null;
  readyAt: Date | null;
  servedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
}

// ─────────────────────────────────────────────
// Kitchen
// ─────────────────────────────────────────────

export interface IKitchenTicket extends Timestamps {
  id: string;
  orderId: string;
  restaurantId: string;
  outletId: string;
  tableSessionId: string;
  status: import('./enums').KitchenTicketStatus;
  priority: number;
  notes: string | null;
  acknowledgedAt: Date | null;
  preparingAt: Date | null;
  readyAt: Date | null;
  completedAt: Date | null;
}

// ─────────────────────────────────────────────
// Bill
// ─────────────────────────────────────────────

export interface IBill extends Timestamps {
  id: string;
  tableSessionId: string;
  restaurantId: string;
  outletId: string;
  status: import('./enums').BillStatus;

  subtotal: string; // Decimal — sum of all order subtotals
  taxTotal: string; // Decimal — sum of all taxes
  discountTotal: string; // Decimal
  roundingAdjustment: string; // Decimal — for rounding to nearest rupee
  grandTotal: string; // Decimal

  paidAmount: string; // Decimal — sum of completed payments
  balanceAmount: string; // Decimal — grandTotal - paidAmount

  paidAt: Date | null;
  voidedAt: Date | null;
  voidReason: string | null;
}

export interface IBillDiscount {
  id: string;
  billId: string;
  description: string;
  discountType: import('./enums').DiscountType;
  discountValue: string; // Decimal
  discountAmount: string; // Calculated amount
  appliedBy: string; // userId
  appliedAt: Date;
}

// ─────────────────────────────────────────────
// Payment
// ─────────────────────────────────────────────

export interface IPayment extends Timestamps {
  id: string;
  billId: string;
  restaurantId: string;
  amount: string; // Decimal
  method: import('./enums').PaymentMethod;
  status: import('./enums').PaymentStatus;
  provider: import('./enums').PaymentProvider;
  providerReference: string | null; // e.g., UPI transaction ID
  notes: string | null;
  markedBy: string | null; // staffUserId for manual payments
  markedAt: Date | null;
  failureReason: string | null;
}

// ─────────────────────────────────────────────
// AI Menu Import
// ─────────────────────────────────────────────

export interface IAiExtractedField<T = string> {
  value: T | null;
  confidence: number; // 0-1
  requiresReview: boolean;
  rawText: string | null;
}

export interface IAiExtractedMenuItem {
  id: string; // temporary local ID for review
  categoryName: IAiExtractedField;
  itemName: IAiExtractedField;
  description: IAiExtractedField;
  price: IAiExtractedField<number>;
  foodType: IAiExtractedField<import('./enums').FoodType>;
  variants: IAiExtractedField<string[]>;
  modifiers: IAiExtractedField<string[]>;
  taxInfo: IAiExtractedField;
  isAvailable: IAiExtractedField<boolean>;
  notes: IAiExtractedField;
  overallConfidence: number;
  requiresReview: boolean;
}

export interface IMenuImport extends Timestamps {
  id: string;
  restaurantId: string;
  fileId: string;
  status: import('./enums').MenuImportStatus;
  aiProvider: import('./enums').AiProvider;
  totalItemsExtracted: number;
  totalItemsApproved: number;
  totalItemsRejected: number;
  totalItemsPublished: number;
  processingError: string | null;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
}

// ─────────────────────────────────────────────
// WebSocket payloads
// ─────────────────────────────────────────────

export interface WsOrderPayload {
  orderId: string;
  orderNumber: string;
  tableSessionId: string;
  tableId: string;
  outletId: string;
  restaurantId: string;
  status: import('./enums').OrderStatus;
  grandTotal: string;
  itemCount: number;
}

export interface WsKitchenTicketPayload {
  ticketId: string;
  orderId: string;
  orderNumber: string;
  tableSessionId: string;
  status: import('./enums').KitchenTicketStatus;
  restaurantId: string;
  outletId: string;
}

export interface WsBillPayload {
  billId: string;
  tableSessionId: string;
  restaurantId: string;
  grandTotal: string;
  paidAmount: string;
  balanceAmount: string;
  status: import('./enums').BillStatus;
}

export interface WsTableSessionPayload {
  sessionId: string;
  tableId: string;
  outletId: string;
  restaurantId: string;
  status: import('./enums').TableSessionStatus;
}

// ─────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────

export interface IDailyReport {
  date: string; // YYYY-MM-DD
  restaurantId: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: string; // Decimal
  averageOrderValue: string; // Decimal
  totalTax: string; // Decimal
  totalDiscount: string; // Decimal
  uniqueTableSessions: number;
  peakHour: number | null; // 0-23
}

export interface ITopMenuItem {
  menuItemId: string;
  name: string;
  orderCount: number;
  totalQuantity: number;
  totalRevenue: string; // Decimal
}

export interface IHourlyOrderCount {
  hour: number; // 0-23
  orderCount: number;
  revenue: string;
}
