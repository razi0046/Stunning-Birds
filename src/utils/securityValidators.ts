import { z } from 'zod';

/**
 * Sanitizes user-generated string to prevent Stored XSS and script injection.
 * Strips script/iframe/object tags, event handlers, and javascript: protocols,
 * and encodes HTML angle brackets.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:[^\s"']*/gi, '')
    .replace(/data:text\/html[^\s"']*/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
    .trim();
}

/**
 * Helper to build a sanitized string Zod schema with min/max constraints
 */
export const safeString = (maxLen = 500, minLen = 0) =>
  z
    .string()
    .max(maxLen, `Must not exceed ${maxLen} characters`)
    .transform((val) => sanitizeString(val))
    .refine((val) => val.length >= minLen, {
      message: `Must be at least ${minLen} characters long`,
    });

/**
 * 1. Product Review Validation Schema
 */
export const ProductReviewSchema = z.object({
  rating: z.coerce.number().min(1, 'Rating must be at least 1').max(5, 'Rating must not exceed 5'),
  title: safeString(150).optional().default('Exceptional craftsmanship'),
  comment: safeString(2000).optional().default(''),
  authorName: safeString(100).optional(),
});

/**
 * 2. Coupon Validation Schema
 */
export const CouponValidateSchema = z.object({
  couponCode: safeString(30, 1),
  subtotal: z.coerce.number().min(0, 'Subtotal cannot be negative').max(10000000, 'Subtotal too large'),
  customerEmail: z.string().email('Invalid email address').max(150).optional().nullable(),
  email: z.string().email('Invalid email address').max(150).optional().nullable(),
  customerId: safeString(100).optional().nullable(),
  userId: safeString(100).optional().nullable(),
});

/**
 * 3. Shipping Address Schema
 */
export const ShippingAddressSchema = z.object({
  phone: safeString(30).optional().default(''),
  pincode: safeString(20).optional().default(''),
  landmark: safeString(200).optional().default(''),
  city: safeString(100).optional().default(''),
  state: safeString(100).optional().default(''),
  addressLine: safeString(500).optional().default(''),
});

/**
 * 4. Order Item Schema
 */
export const OrderItemSchema = z.object({
  productId: safeString(100).optional(),
  id: safeString(100).optional(),
  productName: safeString(200).optional().default('Bespoke Piece'),
  productImage: z.string().max(2000).optional().default(''),
  sku: safeString(50).optional().default('SB-001'),
  skuId: safeString(50).optional(),
  colorName: safeString(50).optional().default(''),
  price: z.coerce.number().min(0, 'Item price cannot be negative').max(5000000),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
  monogram: safeString(10).optional().nullable(),
  foilColor: z.enum(['Gold', 'Silver', 'Blind Deboss', 'Rose Gold', 'Copper']).optional().nullable(),
});

/**
 * 5. Order Checkout Schema
 */
export const CheckoutOrderSchema = z.object({
  id: safeString(60).optional(),
  userId: safeString(100).optional().nullable(),
  user_id: safeString(100).optional().nullable(),
  customer: z
    .object({
      name: safeString(150).optional().default('Client'),
      email: z.string().email('Invalid customer email').max(150).optional().default('client@example.com'),
      avatarInitials: safeString(10).optional(),
    })
    .optional(),
  date: safeString(60).optional(),
  items: z.array(OrderItemSchema).min(1, 'At least one item is required in the order'),
  subtotal: z.coerce.number().min(0, 'Subtotal cannot be negative').max(10000000),
  discountAmount: z.coerce.number().min(0).max(10000000).optional().default(0),
  discount_amount: z.coerce.number().min(0).max(10000000).optional(),
  couponCode: safeString(30).optional().nullable(),
  coupon_code: safeString(30).optional().nullable(),
  discountPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  shipping: z.coerce.number().min(0).max(50000).optional().default(0),
  taxes: z.coerce.number().min(0).max(5000000).optional().default(0),
  total: z.coerce.number().min(0).max(10000000).optional(),
  paymentMethod: safeString(60).optional().default('Debit Card'),
  paymentStatus: z.enum(['Paid', 'Pending', 'Failed', 'Refunded', 'Draft']).optional().default('Paid'),
  fulfillmentStatus: z.enum(['CRAFTING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional().default('CRAFTING'),
  shippingAddress: ShippingAddressSchema.optional().default(() => ({
    phone: '',
    pincode: '',
    landmark: '',
    city: '',
    state: '',
    addressLine: '',
  })),
  shippingMethod: safeString(150).optional().default('Complimentary Express Courier (3-5 Business Days)'),
  timeline: z.array(z.any()).optional(),
  shippingLabel: z.any().optional(),
});

/**
 * 6. Razorpay Create Order Schema
 */
export const RazorpayCreateOrderSchema = z.object({
  amount: z.coerce.number().min(1, 'Payment amount must be at least ₹1').max(10000000, 'Amount exceeds limit'),
  subtotal: z.coerce.number().min(0).max(10000000).optional(),
  couponCode: safeString(30).optional().nullable(),
  currency: z.string().max(10).optional().default('INR'),
  receipt: safeString(50).optional(),
  notes: z.record(z.string(), z.any()).optional(),
  customer: z
    .object({
      name: safeString(150).optional(),
      email: z.string().email('Invalid email').max(150).optional(),
      phone: safeString(30).optional(),
    })
    .optional(),
  userId: safeString(100).optional().nullable(),
  customerEmail: z.string().email('Invalid email').max(150).optional().nullable(),
});

/**
 * 7. Razorpay Signature Verification Schema
 */
export const RazorpayVerifySchema = z.object({
  razorpay_order_id: z.string().min(5, 'Missing razorpay_order_id').max(100),
  razorpay_payment_id: z.string().min(5, 'Missing razorpay_payment_id').max(100),
  razorpay_signature: z.string().min(10, 'Missing razorpay_signature').max(256),
});

/**
 * 8. Product Create / Update Schema
 */
export const ProductInputSchema = z.object({
  id: safeString(100).optional(),
  name: safeString(200, 1),
  sku: safeString(60).optional(),
  skuId: safeString(60).optional(),
  slug: safeString(200).optional(),
  price: z.coerce.number().min(0).max(10000000).optional(),
  sellingPrice: z.coerce.number().min(0).max(10000000).optional(),
  selling_price: z.coerce.number().min(0).max(10000000).optional(),
  originalPrice: z.coerce.number().min(0).max(10000000).optional().nullable(),
  mrp: z.coerce.number().min(0).max(10000000).optional().nullable(),
  original_price: z.coerce.number().min(0).max(10000000).optional().nullable(),
  category: safeString(100).optional().default('Bifold Wallets'),
  colorName: safeString(60).optional().default('Espresso Bridle'),
  colorHex: safeString(30).optional().default('#3a2012'),
  material: safeString(200).optional().default('Full-Grain Vegetable Tanned Leather'),
  dimensions: safeString(100).optional().default(''),
  badge: safeString(40).optional().nullable(),
  inStock: z.boolean().optional().default(true),
  images: z.array(z.string().max(2000)).optional(),
  description: safeString(5000).optional().default('Handcrafted luxury leather wallet piece made in our atelier.'),
  materialsDetails: safeString(3000).optional().default('Natural vegetable tanned leather with hand-burnished beeswax edges.'),
  careInstructions: safeString(3000).optional().default('Condition twice a year with natural leather balm.'),
  shippingInfo: safeString(2000).optional().default('Complimentary express courier across India.'),
  monogramAvailable: z.boolean().optional().default(true),
  productHighlights: z.array(safeString(500)).optional().default([]),
  seoTitle: safeString(250).optional().nullable(),
  seo_title: safeString(250).optional().nullable(),
  seoMetaDescription: safeString(1000).optional().nullable(),
  seo_meta_description: safeString(1000).optional().nullable(),
  seoDescription: safeString(1000).optional().nullable(),
  seo_description: safeString(1000).optional().nullable(),
});

export const ProductPatchSchema = z.object({
  name: safeString(200).optional(),
  sku: safeString(60).optional(),
  skuId: safeString(60).optional(),
  price: z.coerce.number().min(0).max(10000000).optional().nullable(),
  sellingPrice: z.coerce.number().min(0).max(10000000).optional().nullable(),
  selling_price: z.coerce.number().min(0).max(10000000).optional().nullable(),
  originalPrice: z.coerce.number().min(0).max(10000000).optional().nullable(),
  mrp: z.coerce.number().min(0).max(10000000).optional().nullable(),
  original_price: z.coerce.number().min(0).max(10000000).optional().nullable(),
  category: safeString(100).optional(),
  colorName: safeString(60).optional(),
  colorHex: safeString(30).optional(),
  material: safeString(200).optional(),
  dimensions: safeString(100).optional(),
  badge: safeString(40).optional().nullable(),
  inStock: z.boolean().optional(),
  images: z.array(z.string().max(2000)).optional(),
  description: safeString(5000).optional(),
  materialsDetails: safeString(3000).optional(),
  careInstructions: safeString(3000).optional(),
  shippingInfo: safeString(2000).optional(),
  monogramAvailable: z.boolean().optional(),
  productHighlights: z.array(safeString(500)).optional(),
  seoTitle: safeString(250).optional().nullable(),
  seo_title: safeString(250).optional().nullable(),
  seoMetaDescription: safeString(1000).optional().nullable(),
  seo_meta_description: safeString(1000).optional().nullable(),
  seoDescription: safeString(1000).optional().nullable(),
  seo_description: safeString(1000).optional().nullable(),
});

/**
 * 9. Order Status Update Schema
 */
export const OrderStatusPatchSchema = z.object({
  fulfillmentStatus: z.enum(['PROCESSING', 'CRAFTING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['Paid', 'Pending', 'Failed', 'Refunded', 'Draft']).optional(),
});

/**
 * 9.1 Customer Order Cancellation Schema
 */
export const OrderCancelSchema = z.object({
  reason: safeString(500).optional(),
  note: safeString(1000).optional(),
});

/**
 * 9.2 Bulk Order Status Update Schema (Admin Only)
 */
export const BulkOrderStatusPatchSchema = z.object({
  orderIds: z.array(safeString(100, 1)).min(1, 'At least one order ID is required').max(200, 'Cannot update more than 200 orders at once'),
  fulfillmentStatus: z.enum(['PROCESSING', 'CRAFTING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  reason: safeString(500).optional(),
  note: safeString(1000).optional(),
});

/**
 * 10. Newsletter Subscribe Schema
 */
export const NewsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(150, 'Email is too long'),
});

/**
 * 11. Wishlist Toggle Schema
 */
export const WishlistToggleSchema = z.object({
  productId: safeString(100, 1),
});

/**
 * 12. Return Request Schemas (Strict 7-Day & 3-Reason Return Policy)
 */
export const CreateReturnRequestSchema = z.object({
  orderId: safeString(100, 1),
  orderItemId: safeString(100).optional().nullable(),
  productId: safeString(100).optional().nullable(),
  reason: z.enum(['WRONG_PRODUCT', 'DEFECTIVE_PRODUCT', 'MISSING_PRODUCT_PART']),
  description: safeString(1000, 10),
  evidenceEmailConfirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm sending the complete unboxing video to stunningbirds236@gmail.com',
  }),
});

export const AdminReturnRejectSchema = z.object({
  rejectionReason: safeString(1000, 5),
});

export const AdminReturnCourierStatusSchema = z.object({
  status: z.enum([
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
    'IN_TRANSIT',
    'RETURN_RECEIVED',
    'INSPECTION_COMPLETED',
    'REFUND_INITIATED',
    'REFUNDED',
    'RETURN_COMPLETED',
  ]).optional().default('PICKUP_SCHEDULED'),
  courierName: safeString(100).optional(),
  trackingNumber: safeString(100).optional(),
  pickupNotes: safeString(1000).optional(),
  adminNotes: safeString(1000).optional(),
});

export const AdminReturnInspectionSchema = z.object({
  inspectionResult: z.enum(['PASSED', 'FAILED']),
  inspectionNotes: safeString(2000, 5),
});

export const AdminReturnRefundSchema = z.object({
  refundAmount: z.coerce.number().min(0, 'Refund amount cannot be negative').max(10000000).optional(),
  refundReference: safeString(200).optional(),
  refundedAt: safeString(100).optional(),
  manualRefundNote: safeString(1000).optional(),
  notes: safeString(1000).optional(),
  status: z.enum(['REFUNDED', 'RETURN_COMPLETED']).optional().default('REFUNDED'),
  markCompleted: z.boolean().optional(),
  forceManual: z.boolean().optional(),
});

export const AdminReturnStatusSchema = z.object({
  status: z.enum([
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
    'IN_TRANSIT',
    'RETURN_RECEIVED',
    'INSPECTION_COMPLETED',
    'REFUND_INITIATED',
    'REFUNDED',
    'RETURN_COMPLETED',
  ]),
  note: safeString(1000).optional(),
});
