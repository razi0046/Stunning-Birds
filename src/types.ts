export type ProductCategory = 
  | 'Bifold Wallets' 
  | 'Cardholders' 
  | 'Travel Wallets' 
  | 'Bags & Totes' 
  | 'Accessories';

export type FoilColor = 'Gold' | 'Blind Emboss' | 'Silver';

export interface ProductHighlight {
  label: string;
  value: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  date: string;
  verifiedPurchase?: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  skuId?: string; // alias for compatibility
  slug: string;
  price: number; // Current selling/discounted price
  sellingPrice?: number; // Alias for current selling price
  selling_price?: number; // DB alias for selling price
  originalPrice?: number; // MRP / Original maximum retail price
  mrp?: number; // Alias for MRP
  original_price?: number; // DB alias for MRP
  category: ProductCategory;
  colorName: string;
  colorHex: string;
  material: string;
  dimensions?: string;
  rating: number;
  reviewsCount: number;
  badge?: 'BEST SELLER' | 'BESTSELLER' | 'NEW' | 'LIMITED' | 'ARTISAN CHOICE';
  inStock: boolean;
  stockQuantity?: number;
  images: string[];
  description: string;
  materialsDetails: string;
  careInstructions: string;
  shippingInfo: string;
  monogramAvailable?: boolean;
  featured?: boolean;
  isNewArrival?: boolean;
  productHighlights?: ProductHighlight[];
  reviews?: ProductReview[];
  variantGroup?: string;
  linkedVariantIds?: string[];
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  monogram?: string;
  foilColor?: FoilColor;
  selectedColor?: string;
}

export type PaymentMethodType = 'Razorpay' | 'Debit Card' | 'UPI' | 'Net Banking' | 'Cash on Delivery (COD)';

export type FulfillmentStatus = 'PROCESSING' | 'CRAFTING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';

export interface TimelineStep {
  key: string;
  title: string;
  subtitle: string;
  date?: string;
  completed: boolean;
  current: boolean;
}

export interface ShippingLabelItem {
  productName: string;
  sku: string;
  size?: string;
  color?: string;
  orderItemNo?: string;
  quantity: number;
  price: number;
  grossAmount?: number;
  discount?: number;
  taxableValue?: number;
  hsn?: string;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

export interface ShippingLabelSeller {
  name: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  gstin: string;
  returnAddress: string;
}

export interface ShippingLabelShipTo {
  name: string;
  phone: string;
  email?: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface ShippingLabelPackage {
  weightKg: string;
  dimensionsCm: string;
  packageType: string;
  piecesCount: number;
}

export interface ShippingLabel {
  labelId: string;
  awbNumber: string;
  orderId: string;
  purchaseOrderNo?: string;
  orderDate: string;
  orderDateFormatted?: string;
  invoiceDate?: string;
  generatedAt: string;
  courierPartner: string;
  serviceType: string;
  routingHub: string;
  destinationCode?: string;
  returnCode?: string;
  sortCode: string;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  isCod: boolean;
  collectibleAmount: number;
  placeOfSupply?: string;
  shipTo: ShippingLabelShipTo;
  seller: ShippingLabelSeller;
  packageInfo: ShippingLabelPackage;
  items: ShippingLabelItem[];
  subtotal: number;
  taxAmount: number;
  shippingCharge: number;
  totalAmount: number;
  couponCode?: string;
  discountAmount?: number;
  discountPercentage?: number;
  invoiceNumber: string;
  barcodeData: string;
  qrData: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  code?: string;
  discountPercentage?: number;
  discountAmount?: number;
  subtotal?: number;
  taxes?: number;
  total?: number;
}

export interface Order {
  id: string; // e.g. #ORD-0921 or #SB-8924
  userId?: string;
  user_id?: string;
  customer: {
    name: string;
    email: string;
    avatarInitials: string;
    avatarUrl?: string;
  };
  date: string;
  items: {
    productId: string;
    productName: string;
    productImage: string;
    sku?: string;
    skuId?: string;
    colorName: string;
    price: number;
    quantity: number;
    monogram?: string;
    foilColor?: FoilColor;
  }[];
  subtotal: number;
  discountAmount?: number;
  discount_amount?: number;
  couponCode?: string;
  coupon_code?: string;
  discountPercentage?: number;
  shipping: number;
  taxes: number;
  total: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  shippingAddress: {
    phone: string;
    pincode: string;
    landmark?: string;
    city: string;
    state: string;
    addressLine: string;
  };
  shippingMethod: string;
  timeline: TimelineStep[];
  shippingLabel?: ShippingLabel;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export type OrderItem = Order['items'][number];

export interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  receipt?: string;
  status?: string;
  isTestMode?: boolean;
  isSimulated?: boolean;
  notes?: Record<string, string>;
  message?: string;
}

export interface RazorpayPaymentSuccessResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerificationResponse {
  success: boolean;
  verified: boolean;
  message?: string;
  paymentId?: string;
  orderId?: string;
  internalOrderId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarInitials?: string;
  avatarUrl?: string;
  phone?: string;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  societyPoints: number;
  tier: 'ARTISAN TIER' | 'MASTER TIER' | 'HERITAGE PATRON';
  memberSince: string;
  wishlistProductIds: string[];
  addresses: {
    id: string;
    label: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }[];
}

export interface AdminMetrics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  conversionRate: number;
  revenueGrowth: number;
  ordersGrowth: number;
  aovGrowth: number;
  conversionGrowth: number;
  activeCraftingCount?: number;
  dispatchedCount?: number;
  deliveredCount?: number;
  topProducts: {
    name: string;
    sales: number;
    revenue: number;
    image: string;
  }[];
  revenueTrajectory: {
    month: string;
    revenue: number;
  }[];
}

// ==============================================================================
// RETURN & REFUND MANAGEMENT TYPES
// ==============================================================================

export type ReturnReason = 'WRONG_PRODUCT' | 'DEFECTIVE_PRODUCT' | 'MISSING_PRODUCT_PART';

export type ReturnStatus = 
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'RETURN_RECEIVED'
  | 'INSPECTION_COMPLETED'
  | 'REFUND_INITIATED'
  | 'REFUNDED'
  | 'RETURN_COMPLETED';

export type ReturnRefundStatus = 'NOT_APPLICABLE' | 'PENDING' | 'INITIATED' | 'COMPLETED' | 'FAILED';

export type ReturnInspectionResult = 'PENDING' | 'PASSED' | 'FAILED';

export interface ReturnStatusHistory {
  id: string;
  returnRequestId: string;
  oldStatus?: string;
  newStatus: ReturnStatus;
  changedBy: string;
  changedByRole: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  note?: string;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  returnRequestId: string; // e.g. 'RET-SB-1024'
  orderId: string;
  orderItemId?: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productId?: string;
  productName: string;
  productImage?: string;
  productSku?: string;
  quantity: number;
  itemPrice: number;
  paidAmount: number;
  reason: ReturnReason;
  description: string;
  evidenceEmailConfirmed: boolean;
  status: ReturnStatus;
  deliveryAtSubmission: string;
  returnDeadline: string;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  courierName?: string;
  trackingNumber?: string;
  pickupNotes?: string;
  pickupScheduledAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  receivedAt?: string;
  inspectionResult?: ReturnInspectionResult;
  inspectionNotes?: string;
  inspectionAt?: string;
  inspectedBy?: string;
  refundAmount: number;
  refundStatus: ReturnRefundStatus;
  refundReference?: string;
  refundFailureReason?: string;
  refundInitiatedAt?: string;
  refundedAt?: string;
  completedAt?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
  history?: ReturnStatusHistory[];
}
