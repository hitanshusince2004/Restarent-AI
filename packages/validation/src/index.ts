import { z } from 'zod';
import {
  FoodType,
  ModifierSelectionType,
  SystemRole,
  PaymentMethod,
  DiscountType,
  SpiceLevel,
  GstSlab,
} from '@restaurant-os/types';

// =============================================================================
// Restaurant OS — Shared Zod Validation Schemas
// =============================================================================

// ─────────────────────────────────────────────
// Common / Primitives
// ─────────────────────────────────────────────

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format')
  .optional()
  .nullable();

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(254, 'Email must be at most 254 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid decimal number')
  .refine((v) => parseFloat(v) >= 0, 'Must be a non-negative number');

export const positiveIntSchema = z.number().int().positive();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

// ─────────────────────────────────────────────
// Restaurant
// ─────────────────────────────────────────────

export const createRestaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(200),
  description: z.string().max(1000).optional().nullable(),
  phone: phoneSchema,
  email: emailSchema.optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  country: z.string().max(2).default('IN'),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number')
    .optional()
    .nullable(),
  fssaiNumber: z.string().max(14).optional().nullable(),
  defaultTaxRate: z.number().refine((v) => Object.values(GstSlab).includes(v as GstSlab), {
    message: 'Tax rate must be a valid GST slab: 0, 5, 12, 18, 28',
  }).default(5),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

// ─────────────────────────────────────────────
// Outlet
// ─────────────────────────────────────────────

export const createOutletSchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().max(500).optional().nullable(),
  phone: phoneSchema,
  openingTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format')
    .optional()
    .nullable(),
  closingTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format')
    .optional()
    .nullable(),
});

export const updateOutletSchema = createOutletSchema.partial();

// ─────────────────────────────────────────────
// Floor
// ─────────────────────────────────────────────

export const createFloorSchema = z.object({
  name: z.string().min(1).max(100),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateFloorSchema = createFloorSchema.partial();

// ─────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────

export const createTableSchema = z.object({
  name: z.string().min(1).max(50),
  capacity: z.number().int().min(1).max(100),
  floorId: uuidSchema.optional().nullable(),
  positionX: z.number().optional().nullable(),
  positionY: z.number().optional().nullable(),
  width: z.number().positive().optional().nullable(),
  height: z.number().positive().optional().nullable(),
});

export const updateTableSchema = createTableSchema.partial();

export const updateTablePositionSchema = z.object({
  positionX: z.number(),
  positionY: z.number(),
});

// ─────────────────────────────────────────────
// Menu Category
// ─────────────────────────────────────────────

export const createMenuCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateMenuCategorySchema = createMenuCategorySchema.partial();

// ─────────────────────────────────────────────
// Menu Item
// ─────────────────────────────────────────────

export const createMenuItemSchema = z.object({
  categoryId: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  basePrice: z
    .number()
    .min(0, 'Price must be non-negative')
    .max(100000, 'Price seems unreasonably high'),
  foodType: z.nativeEnum(FoodType).default(FoodType.VEG),
  spiceLevel: z.nativeEnum(SpiceLevel).optional().nullable(),
  preparationTimeMinutes: z.number().int().min(0).max(240).optional().nullable(),
  calories: z.number().int().min(0).max(99999).optional().nullable(),
  isRecommended: z.boolean().default(false),
  taxRate: z
    .number()
    .refine((v) => Object.values(GstSlab).includes(v as GstSlab), {
      message: 'Tax rate must be a valid GST slab',
    })
    .default(5),
  hsnCode: z.string().max(10).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  modifierGroupIds: z.array(uuidSchema).default([]),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

// ─────────────────────────────────────────────
// Menu Item Variant
// ─────────────────────────────────────────────

export const createVariantSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0).max(100000),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateVariantSchema = createVariantSchema.partial();

// ─────────────────────────────────────────────
// Menu Modifier Group
// ─────────────────────────────────────────────

export const createModifierGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  selectionType: z.nativeEnum(ModifierSelectionType).default(ModifierSelectionType.SINGLE),
  isRequired: z.boolean().default(false),
  minSelections: z.number().int().min(0).default(0),
  maxSelections: z.number().int().positive().optional().nullable(),
});

export const createModifierOptionSchema = z.object({
  name: z.string().min(1).max(100),
  additionalPrice: z.number().min(0).max(10000),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

// ─────────────────────────────────────────────
// Cart / Order Submission
// ─────────────────────────────────────────────

export const cartItemSchema = z.object({
  menuItemId: uuidSchema,
  variantId: uuidSchema.optional().nullable(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50),
  selectedModifierOptionIds: z.array(uuidSchema).default([]),
  notes: z.string().max(500).optional().nullable(),
});

export const submitOrderSchema = z.object({
  tableSessionId: uuidSchema,
  idempotencyKey: z.string().uuid('Idempotency key must be a UUID'),
  items: z.array(cartItemSchema).min(1, 'At least one item is required').max(50),
  notes: z.string().max(1000).optional().nullable(),
});

// ─────────────────────────────────────────────
// Order Update (status transitions)
// ─────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED']),
  reason: z.string().max(500).optional().nullable(),
});

// ─────────────────────────────────────────────
// Kitchen ticket update
// ─────────────────────────────────────────────

export const updateKitchenTicketSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'PREPARING', 'READY', 'COMPLETED']),
  notes: z.string().max(500).optional().nullable(),
});

// ─────────────────────────────────────────────
// Bill / Discount
// ─────────────────────────────────────────────

export const applyDiscountSchema = z.object({
  description: z.string().min(1).max(200),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z
    .number()
    .positive('Discount value must be positive'),
});

// ─────────────────────────────────────────────
// Payment
// ─────────────────────────────────────────────

export const createPaymentSchema = z.object({
  billId: uuidSchema,
  amount: z.number().positive('Payment amount must be positive'),
  method: z.nativeEnum(PaymentMethod),
  providerReference: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// ─────────────────────────────────────────────
// Staff
// ─────────────────────────────────────────────

export const inviteStaffSchema = z.object({
  email: emailSchema,
  name: z.string().min(2).max(100),
  role: z.nativeEnum(SystemRole),
});

export const updateStaffRoleSchema = z.object({
  role: z.nativeEnum(SystemRole),
});

// ─────────────────────────────────────────────
// Table Session
// ─────────────────────────────────────────────

export const openTableSessionSchema = z.object({
  guestCount: z.number().int().min(1).max(100).optional().nullable(),
});

// ─────────────────────────────────────────────
// Menu Import Review
// ─────────────────────────────────────────────

export const reviewMenuImportItemSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  // Corrected fields after human review
  categoryName: z.string().max(100).optional(),
  itemName: z.string().max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().min(0).max(100000).optional(),
  foodType: z.nativeEnum(FoodType).optional(),
  taxRate: z.number().refine((v) => Object.values(GstSlab).includes(v as GstSlab)).optional(),
});

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string().max(2000)),
});

// ─────────────────────────────────────────────
// QR
// ─────────────────────────────────────────────

export const resolveQrTokenSchema = z.object({
  token: z
    .string()
    .min(10, 'Invalid QR token')
    .max(100, 'Invalid QR token')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid QR token characters'),
});

// ─────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type CreateRestaurantDto = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantDto = z.infer<typeof updateRestaurantSchema>;
export type CreateOutletDto = z.infer<typeof createOutletSchema>;
export type UpdateOutletDto = z.infer<typeof updateOutletSchema>;
export type CreateFloorDto = z.infer<typeof createFloorSchema>;
export type UpdateFloorDto = z.infer<typeof updateFloorSchema>;
export type CreateTableDto = z.infer<typeof createTableSchema>;
export type UpdateTableDto = z.infer<typeof updateTableSchema>;
export type CreateMenuCategoryDto = z.infer<typeof createMenuCategorySchema>;
export type UpdateMenuCategoryDto = z.infer<typeof updateMenuCategorySchema>;
export type CreateMenuItemDto = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemDto = z.infer<typeof updateMenuItemSchema>;
export type CreateVariantDto = z.infer<typeof createVariantSchema>;
export type CreateModifierGroupDto = z.infer<typeof createModifierGroupSchema>;
export type CreateModifierOptionDto = z.infer<typeof createModifierOptionSchema>;
export type CartItemDto = z.infer<typeof cartItemSchema>;
export type SubmitOrderDto = z.infer<typeof submitOrderSchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
export type UpdateKitchenTicketDto = z.infer<typeof updateKitchenTicketSchema>;
export type ApplyDiscountDto = z.infer<typeof applyDiscountSchema>;
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type InviteStaffDto = z.infer<typeof inviteStaffSchema>;
export type PaginationDto = z.infer<typeof paginationSchema>;
export type ReviewMenuImportItemDto = z.infer<typeof reviewMenuImportItemSchema>;
