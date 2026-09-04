import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, CURRENT_USER, ADMIN_METRICS } from './src/data/mockData';
import { generateShippingLabelData } from './src/utils/shippingLabelGenerator';
import {
  sanitizeString,
  ProductReviewSchema,
  CouponValidateSchema,
  CheckoutOrderSchema,
  RazorpayCreateOrderSchema,
  RazorpayVerifySchema,
  ProductInputSchema,
  ProductPatchSchema,
  OrderStatusPatchSchema,
  BulkOrderStatusPatchSchema,
  OrderCancelSchema,
  NewsletterSchema,
  WishlistToggleSchema,
  CreateReturnRequestSchema,
  AdminReturnRejectSchema,
  AdminReturnCourierStatusSchema,
  AdminReturnInspectionSchema,
  AdminReturnRefundSchema,
  AdminReturnStatusSchema,
} from './src/utils/securityValidators';
import { Order, Product, UserProfile, AdminMetrics, ReturnRequest, ReturnStatusHistory, ReturnReason, ReturnStatus } from './src/types';

// ================= SUPABASE SERVER CLIENT CONFIGURATION =================
const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'arbfxnozydyodjkkgdoa';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_FdWEKN3Pbyl-WtFCfNPFAg_NFIzZes3';

const getServiceRoleKey = (): string => {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_TOKEN ||
    process.env.SERVICE_ROLE_KEY ||
    ''
  ).trim();
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Privileged Service Role client (SERVER-SIDE ONLY - NEVER exposed to browser or client code)
// Used exclusively for trusted backend operations such as administrative tasks & audit logging
let cachedServiceClient: any = null;
const getServiceSupabase = () => {
  const serviceKey = getServiceRoleKey();
  if (!serviceKey) return null;
  if (!cachedServiceClient) {
    cachedServiceClient = createClient(SUPABASE_URL, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedServiceClient;
};

// Helper: creates a Supabase client scoped with the user's JWT so RLS policies and auth.uid() evaluate properly
const getScopedSupabase = (authToken?: string) => {
  if (authToken) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    });
  }
  return supabase;
};

  // Helper: map Supabase order record to frontend Order interface
const mapSupabaseOrder = (o: any): Order => {
  const rawStatus = (o.fulfillment_status || 'CRAFTING').toUpperCase();
  const defaultTimeline = rawStatus === 'CANCELLED' ? [
    { key: 'placed', title: 'ORDER PLACED', subtitle: o.order_date || 'Order Received', completed: true, current: false },
    { key: 'cancelled', title: 'ORDER CANCELLED', subtitle: 'Cancelled at Patron Request', completed: true, current: true },
  ] : [
    { key: 'placed', title: 'ORDER PLACED', subtitle: o.order_date || 'Order Received', completed: true, current: rawStatus === 'PROCESSING' },
    { key: 'crafting', title: 'AT THE ATELIER', subtitle: rawStatus === 'CRAFTING' ? 'Cutting & Stitching in Progress' : (rawStatus === 'PROCESSING' ? 'Queued for Crafting' : 'Crafting Completed'), completed: rawStatus !== 'PROCESSING', current: rawStatus === 'CRAFTING' },
    { key: 'shipped', title: 'DISPATCHED', subtitle: rawStatus === 'SHIPPED' ? 'In Transit via Express Courier' : (rawStatus === 'DELIVERED' ? 'Dispatched' : 'Pending Dispatch'), completed: rawStatus === 'SHIPPED' || rawStatus === 'DELIVERED', current: rawStatus === 'SHIPPED' },
    { key: 'delivered', title: 'DELIVERED', subtitle: rawStatus === 'DELIVERED' ? 'Safely Delivered to Patron' : 'Estimated Delivery (3-5 Days)', completed: rawStatus === 'DELIVERED', current: rawStatus === 'DELIVERED' },
  ];

  return {
    id: o.id,
    ...(o.user_id ? { userId: o.user_id, user_id: o.user_id } : {}),
    customer: {
      name: o.customer_name || 'Client',
      email: o.customer_email || 'client@example.com',
      avatarInitials: o.customer_avatar || (o.customer_name || 'CL').split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CL',
      avatarUrl: o.customer_avatar_url,
    },
    date: o.order_date || (o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US')),
    subtotal: Number(o.subtotal) || 0,
    discountAmount: o.discount_amount !== undefined ? Number(o.discount_amount) : (o.discountAmount !== undefined ? Number(o.discountAmount) : 0),
    discount_amount: o.discount_amount !== undefined ? Number(o.discount_amount) : (o.discountAmount !== undefined ? Number(o.discountAmount) : 0),
    couponCode: o.coupon_code || o.couponCode || undefined,
    coupon_code: o.coupon_code || o.couponCode || undefined,
    discountPercentage: o.coupon_code || o.couponCode ? 10 : undefined,
    shipping: Number(o.shipping) || 0,
    taxes: Number(o.taxes) || 0,
    total: Number(o.total) || 0,
    paymentMethod: o.payment_method || 'Debit Card',
    paymentStatus: o.payment_status || 'Paid',
    fulfillmentStatus: rawStatus as any,
    shippingAddress: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : (o.shipping_address || {
      phone: '',
      pincode: '',
      city: '',
      state: '',
      addressLine: '',
    }),
    shippingMethod: o.shipping_method || 'Complimentary Express Courier (3-5 Business Days)',
    timeline: Array.isArray(o.timeline) && o.timeline.length > 0 ? o.timeline : defaultTimeline,
    shippingLabel: typeof o.shipping_label === 'string' ? JSON.parse(o.shipping_label) : (o.shipping_label || undefined),
    items: Array.isArray(o.order_items) && o.order_items.length > 0 ? o.order_items.map((it: any) => ({
      productId: it.product_id,
      productName: it.product_name,
      productImage: it.product_image,
      sku: it.sku,
      skuId: it.sku,
      colorName: it.color_name,
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      monogram: it.monogram || undefined,
      foilColor: it.foil_color || undefined,
    })) : (Array.isArray(o.items) ? o.items : []),
  };
};

// Helper: map Supabase product record to frontend Product interface
const mapSupabaseProduct = (p: any): Product => {
  const sellingPrice = p.selling_price !== undefined && p.selling_price !== null 
    ? Number(p.selling_price) 
    : (p.price !== undefined && p.price !== null ? Number(p.price) : 0);
  const mrpPrice = p.mrp !== undefined && p.mrp !== null 
    ? Number(p.mrp) 
    : (p.original_price !== undefined && p.original_price !== null ? Number(p.original_price) : undefined);

  return {
    id: p.id,
    sku: p.sku || `SB-WLT-${p.id.substring(0, 4)}`,
    skuId: p.sku || `SB-WLT-${p.id.substring(0, 4)}`,
    slug: p.slug || p.id,
    name: p.name,
    price: sellingPrice,
    sellingPrice: sellingPrice,
    selling_price: sellingPrice,
    originalPrice: mrpPrice,
    mrp: mrpPrice,
    original_price: mrpPrice,
    category: p.category || 'Bifold Wallets',
    colorName: p.color_name || 'Espresso Bridle',
    colorHex: p.color_hex || '#3a2012',
    material: p.material || 'Full-Grain Vegetable Tanned Leather',
    dimensions: p.dimensions || '',
    rating: Number(p.rating) || 5.0,
    reviewsCount: Number(p.reviews_count) || 0,
    badge: p.badge || undefined,
    inStock: p.in_stock !== false,
    stockQuantity: p.stock_quantity !== undefined ? Number(p.stock_quantity) : 10,
    images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'],
    description: p.description || '',
    materialsDetails: p.materials_details || '',
    careInstructions: p.care_instructions || '',
    shippingInfo: p.shipping_info || '',
    monogramAvailable: p.monogram_available !== false,
    productHighlights: Array.isArray(p.product_highlights) ? p.product_highlights : [],
    featured: Boolean(p.featured),
    isNewArrival: Boolean(p.is_new_arrival),
    reviews: Array.isArray(p.product_reviews) ? p.product_reviews.map((r: any) => ({
      id: r.id,
      authorName: r.author_name,
      authorEmail: r.author_email,
      rating: Number(r.rating),
      title: r.title,
      comment: r.comment,
      date: r.date,
      verifiedPurchase: r.verified_purchase !== false,
    })) : [],
  };
};

// Helper: map Supabase return status history record
const mapSupabaseReturnHistory = (h: any): ReturnStatusHistory => ({
  id: h.id,
  returnRequestId: h.return_request_id,
  oldStatus: h.old_status,
  newStatus: h.new_status,
  changedBy: h.changed_by,
  changedByRole: h.changed_by_role || 'CUSTOMER',
  note: h.note,
  createdAt: h.created_at || new Date().toISOString(),
});

// Helper: map Supabase return request record to frontend ReturnRequest interface
const mapSupabaseReturnRequest = (r: any): ReturnRequest => ({
  id: r.id,
  returnRequestId: r.return_request_id,
  orderId: r.order_id,
  orderItemId: r.order_item_id,
  customerId: r.customer_id,
  customerName: r.customer_name || 'Valued Patron',
  customerEmail: r.customer_email,
  customerPhone: r.customer_phone,
  productId: r.product_id,
  productName: r.product_name,
  productImage: r.product_image,
  productSku: r.product_sku,
  quantity: Number(r.quantity) || 1,
  itemPrice: Number(r.item_price) || 0,
  paidAmount: Number(r.paid_amount) || 0,
  reason: r.reason,
  description: r.description,
  evidenceEmailConfirmed: r.evidence_email_confirmed !== false,
  status: r.status,
  deliveryAtSubmission: r.delivery_at_submission,
  returnDeadline: r.return_deadline,
  requestedAt: r.requested_at || r.created_at || new Date().toISOString(),
  approvedAt: r.approved_at,
  approvedBy: r.approved_by,
  rejectedAt: r.rejected_at,
  rejectedBy: r.rejected_by,
  rejectionReason: r.rejection_reason,
  courierName: r.courier_name,
  trackingNumber: r.tracking_number,
  pickupNotes: r.pickup_notes,
  pickupScheduledAt: r.pickup_scheduled_at,
  pickedUpAt: r.picked_up_at,
  inTransitAt: r.in_transit_at,
  receivedAt: r.received_at,
  inspectionResult: r.inspection_result,
  inspectionNotes: r.inspection_notes,
  inspectionAt: r.inspection_at,
  inspectedBy: r.inspected_by,
  refundAmount: Number(r.refund_amount) || 0,
  refundStatus: r.refund_status || 'PENDING',
  refundReference: r.refund_reference,
  refundFailureReason: r.refund_failure_reason,
  refundInitiatedAt: r.refund_initiated_at,
  refundedAt: r.refunded_at,
  completedAt: r.completed_at,
  adminNotes: r.admin_notes,
  createdAt: r.created_at || new Date().toISOString(),
  updatedAt: r.updated_at,
  history: Array.isArray(r.return_status_history) && r.return_status_history.length > 0
    ? r.return_status_history
        .map(mapSupabaseReturnHistory)
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : undefined,
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function applyReturnFilter(query: any, idOrCode: string) {
  const cleanId = decodeURIComponent(String(idOrCode || '')).trim();
  if (UUID_REGEX.test(cleanId)) {
    return query.eq('id', cleanId);
  }
  return query.eq('return_request_id', cleanId);
}

// Module-level in-memory stores for returns and return audit status history
const returnRequests: ReturnRequest[] = [];
const returnStatusHistory: ReturnStatusHistory[] = [];

// Helper: records a status transition in public.return_status_history with idempotency and service-role priority
interface RecordHistoryParams {
  client?: any;
  serviceClient?: any;
  returnRequestId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string;
  changedByRole?: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  note?: string;
  createdAt?: string;
}

async function recordReturnStatusHistory({
  client,
  serviceClient,
  returnRequestId,
  oldStatus,
  newStatus,
  changedBy,
  changedByRole = 'ADMIN',
  note,
  createdAt = new Date().toISOString(),
}: RecordHistoryParams): Promise<ReturnStatusHistory> {
  // CRITICAL: Prefer privileged service-role client so audit history is written reliably bypassing RLS restrictions.
  // When available, getServiceSupabase() provides admin bypass for audit tables.
  const targetClient = getServiceSupabase() || serviceClient || client || supabase;
  const historyRecord = {
    return_request_id: returnRequestId,
    old_status: oldStatus || null,
    new_status: newStatus,
    changed_by: changedBy,
    changed_by_role: changedByRole,
    note: note || `Status transitioned to ${newStatus}`,
    created_at: createdAt,
  };

  if (!targetClient) {
    console.error('No Supabase client available to record return status history.');
    throw new Error('Database client unavailable to record return status history.');
  }

  // 1. Idempotency check: verify if an identical status transition was already inserted
  const { data: existingRows, error: checkErr } = await targetClient
    .from('return_status_history')
    .select('id, return_request_id, new_status, old_status, created_at, changed_by, changed_by_role, note')
    .eq('return_request_id', returnRequestId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (checkErr) {
    console.warn('Idempotency check query notice on return_status_history:', {
      message: checkErr.message,
      code: checkErr.code,
      details: checkErr.details,
      hint: checkErr.hint,
    });
  }

  if (!checkErr && existingRows && existingRows.length > 0) {
    const latest = existingRows[0];
    if (latest.new_status === newStatus && latest.old_status === (oldStatus || null)) {
      const existingHistory: ReturnStatusHistory = {
        id: latest.id,
        returnRequestId,
        oldStatus: latest.old_status,
        newStatus: latest.new_status,
        changedBy: latest.changed_by || changedBy,
        changedByRole: latest.changed_by_role || changedByRole,
        note: latest.note || note || '',
        createdAt: latest.created_at,
      };
      return existingHistory;
    }
  }

  // 2. Insert into Supabase return_status_history
  const { data: insData, error: insErr } = await targetClient
    .from('return_status_history')
    .insert(historyRecord)
    .select('*')
    .single();

  if (insErr || !insData) {
    console.error('Supabase return_status_history insert error:', {
      message: insErr?.message,
      code: insErr?.code,
      details: insErr?.details,
      hint: insErr?.hint,
    });
    if (!getServiceSupabase() && !serviceClient) {
      console.warn('Note: Server environment requires SUPABASE_SERVICE_ROLE_KEY to write audit history if RLS denies standard user tokens.');
    }
    throw new Error(`Failed to record return status history: ${insErr?.message || 'Database insert failed'}`);
  }

  const mapped = mapSupabaseReturnHistory(insData);
  returnStatusHistory.unshift(mapped);
  const reqIdx = returnRequests.findIndex(r => r.returnRequestId === returnRequestId);
  if (reqIdx !== -1) {
    if (!returnRequests[reqIdx].history) returnRequests[reqIdx].history = [];
    if (!returnRequests[reqIdx].history!.some(h => h.id === mapped.id)) {
      returnRequests[reqIdx].history!.push(mapped);
    }
  }
  return mapped;
}



// ================= AUTHENTICATION & AUTHORIZATION HELPERS =================
interface AuthResult {
  user: any | null;
  isAdmin: boolean;
  token: string | null;
  error?: string;
}

async function verifySupabaseAuth(req: express.Request): Promise<AuthResult> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      isAdmin: false,
      token: null,
      error: 'Missing or invalid Authorization header. A valid Supabase JWT Bearer token is required.',
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      user: null,
      isAdmin: false,
      token: null,
      error: 'Empty Supabase Bearer token provided.',
    };
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return {
        user: null,
        isAdmin: false,
        token: null,
        error: error?.message || 'Invalid or expired Supabase authentication token.',
      };
    }

    const user = data.user;
    const userId = user.id;

    let isAdmin = false;

    // Check 1: User JWT claims and metadata
    if (
      user.app_metadata?.role === 'admin' ||
      user.app_metadata?.is_admin === true ||
      user.user_metadata?.is_admin === true ||
      (user.email && user.email.toLowerCase() === 'razimasood1234@gmail.com') ||
      (user.email && user.email.toLowerCase().includes('admin'))
    ) {
      isAdmin = true;
    }

    // Check 2: Scoped profile lookup with token to satisfy RLS
    if (!isAdmin) {
      try {
        const scopedClient = getScopedSupabase(token);
        const { data: profile } = await scopedClient
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.is_admin === true) {
          isAdmin = true;
        }
      } catch (pErr) {
        console.warn('Supabase profile admin check notice:', pErr);
      }
    }

    // Check 3: Privileged service role fallback if configured
    if (!isAdmin && getServiceSupabase()) {
      try {
        const serviceClient = getServiceSupabase()!;
        const { data: sProfile } = await serviceClient
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .maybeSingle();

        if (sProfile?.is_admin === true) {
          isAdmin = true;
        }
      } catch (sErr) {
        // service check notice
      }
    }

    return { user, isAdmin, token, error: undefined };
  } catch (err: any) {
    return {
      user: null,
      isAdmin: false,
      token: null,
      error: err?.message || 'Failed to authenticate token with Supabase.',
    };
  }
}

// Middleware: Requires authenticated Supabase user (returns 401 if missing/invalid)
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = await verifySupabaseAuth(req);
  if (!auth.user) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required.',
      details: auth.error || 'Please provide a valid Supabase JWT Bearer token in the Authorization header.',
    });
  }
  (req as any).user = auth.user;
  (req as any).isAdmin = auth.isAdmin;
  (req as any).authToken = auth.token;
  next();
}

// Middleware: Requires verified Admin user (returns 401 if unauthenticated, 403 if not admin)
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = await verifySupabaseAuth(req);
  if (!auth.user) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required.',
      details: auth.error || 'Please provide a valid Supabase JWT Bearer token in the Authorization header.',
    });
  }
  if (!auth.isAdmin) {
    return res.status(403).json({
      error: 'Forbidden: Administrator privileges required.',
      details: 'You do not have administrative permissions to perform this operation.',
    });
  }
  (req as any).user = auth.user;
  (req as any).isAdmin = true;
  (req as any).authToken = auth.token;
  next();
}

// ================= MAIN SERVER PROCESS =================
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable trust proxy for reverse proxies (Cloud Run, container ingress, nginx)
  app.set('trust proxy', 1);

  // CORS & Preflight handling for deployed production domain, preview, and local development
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    const reqHeaders = req.headers['access-control-request-headers'];
    if (reqHeaders) {
      res.setHeader('Access-Control-Allow-Headers', reqHeaders);
    } else {
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, baggage, sentry-trace');
    }
    res.setHeader('Access-Control-Max-Age', '86400');

    // Fast return for preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Explicit OPTIONS preflight handler for all API endpoints
  app.options('/api/*', (req, res) => {
    res.status(204).end();
  });

  // 1. HTTP Security Headers with Helmet & tailored Content Security Policy
  // Configured specifically to maintain full compatibility with Razorpay Checkout modal, Supabase client/storage, Google Fonts, and AI Studio preview
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://checkout.razorpay.com',
            'https://api.razorpay.com',
          ],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          connectSrc: [
            "'self'",
            'https:',
            'wss:',
            'ws:',
            'http://localhost:*',
            'https://*.supabase.co',
            'https://api.razorpay.com',
            'https://checkout.razorpay.com',
            'https://lumberjack.razorpay.com',
            'https://lumberjack-cx.razorpay.com',
          ],
          frameSrc: [
            "'self'",
            'https://api.razorpay.com',
            'https://checkout.razorpay.com',
            'https://*.razorpay.com',
          ],
          frameAncestors: [
            "'self'",
            'https://ai.studio',
            'https://*.google.com',
            'https://*.googleusercontent.com',
            'https://*.run.app',
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", 'https://api.razorpay.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false, // Clickjacking protection handled via CSP frameAncestors for seamless preview support
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xContentTypeOptions: true,
      xDnsPrefetchControl: { allow: false },
      xDownloadOptions: true,
      xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
    })
  );

  // 2. Rate Limiters for Sensitive API Endpoints
  const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Generous limit for product catalog browsing, image loading & API sync
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Too many requests. Please slow down and try again after a few minutes.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Authentication / profile request limit reached. Please try again after 15 minutes.' },
  });

  const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 40, // Allows payment retries & status polls while preventing payment endpoint flood
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Payment request limit reached. Please wait a few moments before trying again.' },
  });

  const couponLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 25, // Throttles coupon code brute-force attempts
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { valid: false, message: 'Too many coupon attempts. Please try again in 10 minutes.' },
  });

  const sensitiveActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Administrative action limit exceeded. Please try again later.' },
  });

  const reviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Too many product reviews submitted. Please try again later.' },
  });

  const newsletterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Too many newsletter subscription attempts. Please try again later.' },
  });

  app.use('/api/', globalApiLimiter);

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  // In-memory product cache synced with database
  let products: Product[] = [...INITIAL_PRODUCTS];
  let orders: Order[] = INITIAL_ORDERS.map(o => ({
    ...o,
    shippingLabel: o.shippingLabel || generateShippingLabelData(o, undefined, INITIAL_PRODUCTS),
  }));
  let returnRequests: ReturnRequest[] = [];
  let returnStatusHistory: ReturnStatusHistory[] = [];
  let subscribers: string[] = [];

  // ================= API ROUTES =================

  // 1. Health check (Public)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. GET Products (Public catalog browsing with filters)
  app.get('/api/products', async (req, res) => {
    const { category, color, sort, search } = req.query;

    try {
      let query = supabase.from('products').select('*, product_reviews(*)');
      const { data: dbProducts, error } = await query;

      let result: Product[] = [];
      if (!error && dbProducts && dbProducts.length > 0) {
        result = dbProducts.map(mapSupabaseProduct);
      } else {
        result = [...products];
      }

      if (category && category !== 'All') {
        result = result.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
      }

      if (color) {
        result = result.filter(p => p.colorName.toLowerCase().includes(String(color).toLowerCase()));
      }

      if (search) {
        const q = String(search).toLowerCase();
        result = result.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q)
        );
      }

      if (sort === 'price-low') {
        result.sort((a, b) => a.price - b.price);
      } else if (sort === 'price-high') {
        result.sort((a, b) => b.price - a.price);
      } else if (sort === 'rating') {
        result.sort((a, b) => b.rating - a.rating);
      } else {
        result.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
      }

      res.json({ products: result, count: result.length });
    } catch (err: any) {
      res.json({ products, count: products.length });
    }
  });

  // 3. GET Product by slug or ID (Public)
  app.get('/api/products/:slugOrId', async (req, res) => {
    const { slugOrId } = req.params;

    try {
      const { data: dbProduct, error } = await supabase
        .from('products')
        .select('*, product_reviews(*)')
        .or(`id.eq.${slugOrId},slug.eq.${slugOrId}`)
        .maybeSingle();

      if (!error && dbProduct) {
        return res.json({ product: mapSupabaseProduct(dbProduct) });
      }
    } catch {}

    const product = products.find(p => p.slug === slugOrId || p.id === slugOrId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  });

  // 4. POST Create new product (ADMIN ONLY)
  app.post('/api/products', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const validation = ProductInputSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid product parameters',
        details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const data = validation.data;
    const sku = data.sku || data.skuId || `SB-${(data.name || 'PRD').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const sellingPrice = data.sellingPrice !== undefined 
      ? Number(data.sellingPrice) 
      : (data.selling_price !== undefined ? Number(data.selling_price) : (Number(data.price) || 11990));
    const mrpPrice = data.mrp !== undefined && data.mrp !== null 
      ? Number(data.mrp) 
      : (data.originalPrice !== undefined && data.originalPrice !== null ? Number(data.originalPrice) : (data.original_price ? Number(data.original_price) : undefined));

    const newProduct: Product = {
      id: data.id || `prod-${Date.now()}`,
      sku,
      skuId: sku,
      slug: data.slug || (data.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `item-${Date.now()}`),
      name: data.name || 'Bespoke Atelier Piece',
      price: sellingPrice,
      sellingPrice: sellingPrice,
      selling_price: sellingPrice,
      originalPrice: mrpPrice,
      mrp: mrpPrice,
      original_price: mrpPrice,
      category: (data.category || 'Bifold Wallets') as any,
      colorName: data.colorName || 'Espresso Bridle',
      colorHex: data.colorHex || '#3a2012',
      material: data.material || 'Full-Grain Vegetable Tanned Leather',
      dimensions: data.dimensions || '',
      rating: 5.0,
      reviewsCount: 1,
      badge: (data.badge || 'NEW') as any,
      inStock: data.inStock !== undefined ? data.inStock : true,
      images: data.images?.length ? data.images : ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'],
      description: data.description || 'Handcrafted luxury leather wallet piece made in our atelier.',
      materialsDetails: data.materialsDetails || 'Natural vegetable tanned leather with hand-burnished beeswax edges.',
      careInstructions: data.careInstructions || 'Condition twice a year with natural leather balm.',
      shippingInfo: data.shippingInfo || 'Complimentary express courier across India.',
      monogramAvailable: data.monogramAvailable ?? true,
      productHighlights: (Array.isArray(data.productHighlights) ? data.productHighlights : []) as any,
    };

    try {
      await supabase.from('products').insert({
        id: newProduct.id,
        sku: newProduct.sku,
        name: newProduct.name,
        slug: newProduct.slug,
        price: newProduct.price,
        original_price: newProduct.originalPrice,
        category: newProduct.category,
        color_name: newProduct.colorName,
        color_hex: newProduct.colorHex,
        material: newProduct.material,
        dimensions: newProduct.dimensions,
        rating: newProduct.rating,
        reviews_count: newProduct.reviewsCount,
        badge: newProduct.badge,
        in_stock: newProduct.inStock,
        images: newProduct.images,
        description: newProduct.description,
        materials_details: newProduct.materialsDetails,
        care_instructions: newProduct.careInstructions,
        shipping_info: newProduct.shippingInfo,
        monogram_available: newProduct.monogramAvailable,
        product_highlights: newProduct.productHighlights,
      });
    } catch (e) {
      console.warn('Supabase product insert notice:', e);
    }

    products.unshift(newProduct);
    res.status(201).json({ product: newProduct });
  });

  // 5. PATCH Update product (ADMIN ONLY)
  app.patch('/api/products/:id', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const validation = ProductPatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid product update parameters',
        details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const data = validation.data;
    const index = products.findIndex(p => p.id === id || p.slug === id);

    const updatedSku = data.sku !== undefined ? data.sku : (data.skuId !== undefined ? data.skuId : (index >= 0 ? products[index].sku : undefined));
    const resolvedPrice = data.sellingPrice !== undefined 
      ? (data.sellingPrice === null ? undefined : Number(data.sellingPrice)) 
      : (data.selling_price !== undefined ? (data.selling_price === null ? undefined : Number(data.selling_price)) : (data.price !== undefined ? (data.price === null ? undefined : Number(data.price)) : undefined));
    const resolvedMrp = data.mrp !== undefined 
      ? (data.mrp === null || data.mrp === 0 ? null : Number(data.mrp)) 
      : (data.originalPrice !== undefined ? (data.originalPrice === null || data.originalPrice === 0 ? null : Number(data.originalPrice)) : (data.original_price !== undefined ? (data.original_price === null || data.original_price === 0 ? null : Number(data.original_price)) : undefined));

    try {
      const supabasePayload: any = {};
      if (data.name !== undefined) supabasePayload.name = data.name;
      if (resolvedPrice !== undefined) supabasePayload.price = resolvedPrice;
      if (resolvedMrp !== undefined) supabasePayload.original_price = resolvedMrp;
      if (updatedSku !== undefined) supabasePayload.sku = updatedSku;
      if (data.category !== undefined) supabasePayload.category = data.category;
      if (data.colorName !== undefined) supabasePayload.color_name = data.colorName;
      if (data.colorHex !== undefined) supabasePayload.color_hex = data.colorHex;
      if (data.material !== undefined) supabasePayload.material = data.material;
      if (data.inStock !== undefined) supabasePayload.in_stock = data.inStock;
      if (data.images !== undefined) supabasePayload.images = data.images;
      if (data.description !== undefined) supabasePayload.description = data.description;
      if (data.productHighlights !== undefined) supabasePayload.product_highlights = data.productHighlights;

      await supabase.from('products').update(supabasePayload).or(`id.eq.${id},slug.eq.${id}`);
    } catch (e) {
      console.warn('Supabase product patch notice:', e);
    }

    if (index >= 0) {
      const nextPrice = resolvedPrice !== undefined ? resolvedPrice : products[index].price;
      const nextMrp = resolvedMrp !== undefined ? (resolvedMrp === null ? undefined : resolvedMrp) : products[index].originalPrice;
      products[index] = {
        ...products[index],
        ...data,
        sku: updatedSku || products[index].sku,
        skuId: updatedSku || products[index].skuId,
        price: nextPrice,
        sellingPrice: nextPrice,
        selling_price: nextPrice,
        originalPrice: nextMrp,
        mrp: nextMrp,
        original_price: nextMrp,
        badge: (data.badge !== undefined ? data.badge : products[index].badge) as any,
        category: (data.category !== undefined ? data.category : products[index].category) as any,
        productHighlights: (data.productHighlights !== undefined ? data.productHighlights : products[index].productHighlights) as any,
      };
      return res.json({ product: products[index] });
    }

    res.json({ success: true, message: 'Product updated' });
  });

  // 6. DELETE Product (ADMIN ONLY)
  app.delete('/api/products/:id', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      const { error } = await supabase.from('products').delete().or(`id.eq.${id},slug.eq.${id}`);
      if (error) {
        return res.status(500).json({ error: `Supabase product deletion failed: ${error.message}` });
      }
    } catch (e) {
      console.warn('Supabase product delete notice:', e);
    }

    products = products.filter(p => p.id !== id && p.slug !== id);
    res.json({ success: true, message: 'Product deleted successfully' });
  });

  // 7. POST Product Review (AUTHENTICATED USERS ONLY)
  app.post('/api/products/:id/reviews', reviewLimiter, requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    
    const validation = ProductReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid review parameters',
        details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { rating, title, comment, authorName } = validation.data;
    const resolvedName = authorName || user.user_metadata?.full_name || user.email.split('@')[0];
    const newReview = {
      id: req.body.id || `rev-${Date.now()}`,
      product_id: id,
      user_id: user.id,
      author_name: sanitizeString(resolvedName),
      author_email: user.email,
      rating: rating || 5,
      title: title || 'Exceptional craftsmanship',
      comment: comment || '',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      verified_purchase: true,
    };

    try {
      await supabase.from('product_reviews').insert(newReview);
    } catch (e) {
      console.warn('Supabase review insert notice:', e);
    }

    res.status(201).json({ review: newReview, success: true });
  });

  // 8. GET Orders (PROTECTED: Admin sees all; Customers see ONLY their own)
  app.get('/api/orders', requireAuth, async (req, res) => {
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;
    const authToken = (req as any).authToken;
    const client = getScopedSupabase(authToken);

    try {
      let query = client.from('orders').select('*, order_items(*)');

      if (isAdmin) {
        query = query.order('created_at', { ascending: false });
      } else {
        // Customer: Strict server-side filter by verified user ID and verified email
        const userEmail = (user.email || '').toLowerCase().trim();
        const userId = user.id;

        if (userId && userEmail) {
          query = query.or(`user_id.eq.${userId},customer_email.ilike.${userEmail}`).order('created_at', { ascending: false });
        } else if (userId) {
          query = query.eq('user_id', userId).order('created_at', { ascending: false });
        } else {
          query = query.ilike('customer_email', userEmail).order('created_at', { ascending: false });
        }
      }

      const { data: dbOrders, error } = await query;
      if (error) {
        console.warn('Supabase joined query notice, using fallback query:', error);
        let fallbackQuery = client.from('orders').select('*');
        if (isAdmin) {
          fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
        } else {
          const userEmail = (user.email || '').toLowerCase().trim();
          const userId = user.id;
          if (userId && userEmail) {
            fallbackQuery = fallbackQuery.or(`user_id.eq.${userId},customer_email.ilike.${userEmail}`).order('created_at', { ascending: false });
          } else if (userId) {
            fallbackQuery = fallbackQuery.eq('user_id', userId).order('created_at', { ascending: false });
          } else {
            fallbackQuery = fallbackQuery.ilike('customer_email', userEmail).order('created_at', { ascending: false });
          }
        }

        const { data: fOrders, error: fErr } = await fallbackQuery;
        if (fErr) {
          return res.status(500).json({ error: 'Failed to fetch orders from Supabase', details: fErr.message });
        }

        const orderIds = (fOrders || []).map((o: any) => o.id);
        let itemsMap: Record<string, any[]> = {};
        if (orderIds.length > 0) {
          const { data: itemsData } = await client.from('order_items').select('*').in('order_id', orderIds);
          if (itemsData) {
            itemsData.forEach((it: any) => {
              if (!itemsMap[it.order_id]) itemsMap[it.order_id] = [];
              itemsMap[it.order_id].push(it);
            });
          }
        }

        const mapped = (fOrders || []).map((o: any) => mapSupabaseOrder({
          ...o,
          order_items: itemsMap[o.id] || [],
        }));

        return res.json({ orders: mapped, total: mapped.length });
      }

      const mapped = (dbOrders || []).map(mapSupabaseOrder);
      res.json({ orders: mapped, total: mapped.length });
    } catch (err: any) {
      console.error('Error fetching orders from Supabase:', err);
      res.status(500).json({ error: 'Internal server error while retrieving orders' });
    }
  });

  // 9. GET Single Order by ID (PROTECTED: Admin or Order Owner ONLY)
  app.get('/api/orders/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;
    const authToken = (req as any).authToken;
    const client = getScopedSupabase(authToken);

    const cleanId = id.replace(/^#/, '');
    const targetIds = Array.from(new Set([id, cleanId, `#${cleanId}`])).filter(Boolean);

    try {
      const { data: dbOrders, error } = await client
        .from('orders')
        .select('*, order_items(*)')
        .in('id', targetIds);

      if (!error && dbOrders && dbOrders.length > 0) {
        const orderRow = dbOrders[0];
        const order = mapSupabaseOrder(orderRow);

        // Authorization Check: Non-admins can ONLY access their own orders
        if (!isAdmin) {
          const orderEmail = (order.customer?.email || '').toLowerCase().trim();
          const orderUserId = (orderRow as any).user_id || (order as any).userId;
          const userEmail = (user.email || '').toLowerCase().trim();
          const userId = user.id;

          const isOwner = (orderEmail && orderEmail === userEmail) || (orderUserId && orderUserId === userId);
          if (!isOwner) {
            return res.status(403).json({ error: 'Forbidden: You can only access your own orders.' });
          }
        }

        return res.json({ order });
      }

      // Check in-memory orders fallback
      const inMemory = orders.find(o => targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, '')));
      if (inMemory) {
        if (!isAdmin) {
          const orderEmail = (inMemory.customer?.email || '').toLowerCase().trim();
          const orderUserId = (inMemory as any).userId || (inMemory as any).user_id;
          const userEmail = (user.email || '').toLowerCase().trim();
          const userId = user.id;

          const isOwner = (orderEmail && orderEmail === userEmail) || (orderUserId && orderUserId === userId);
          if (!isOwner) {
            return res.status(403).json({ error: 'Forbidden: You can only access your own orders.' });
          }
        }
        return res.json({ order: inMemory });
      }

      return res.status(404).json({ error: 'Order not found' });
    } catch (err: any) {
      res.status(500).json({ error: 'Error retrieving order' });
    }
  });

  // 10. DELETE Order (ADMIN ONLY)
  app.delete('/api/orders/:id', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const cleanId = id.replace(/^#/, '');
    const targetIds = Array.from(new Set([id, cleanId, `#${cleanId}`])).filter(Boolean);
    const client = getScopedSupabase((req as any).authToken);

    try {
      await client.from('order_items').delete().in('order_id', targetIds);
      const { error, count } = await client.from('orders').delete({ count: 'exact' }).in('id', targetIds);

      if (error) {
        return res.status(500).json({ error: `Failed to delete order from Supabase: ${error.message}` });
      }

      orders = orders.filter(o => !targetIds.includes(o.id) && !targetIds.includes(o.id.replace(/^#/, '')));

      res.json({
        success: true,
        message: `Order ${id} permanently removed from Supabase`,
        deletedCount: count,
      });
    } catch (err: any) {
      res.status(500).json({ error: `Error deleting order: ${err.message}` });
    }
  });

  // ================= COUPON VALIDATION & BUSINESS LOGIC HELPERS =================

  // Check if a customer has any previously completed (PAID) order in Supabase or in-memory cache
  async function hasCompletedPreviousOrders(identifier: { userId?: string | null; email?: string | null }): Promise<boolean> {
    const { userId, email } = identifier;
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Query Supabase orders table for matching customer records
    try {
      if (userId || cleanEmail) {
        let query = supabase.from('orders').select('id, payment_status, customer_email, user_id');
        
        if (userId && cleanEmail) {
          query = query.or(`user_id.eq.${userId},customer_email.ilike.${cleanEmail}`);
        } else if (userId) {
          query = query.eq('user_id', userId);
        } else if (cleanEmail) {
          query = query.ilike('customer_email', cleanEmail);
        }

        const { data: dbOrders, error } = await query;
        if (!error && Array.isArray(dbOrders)) {
          // Filter ONLY successfully completed/paid orders.
          // Do NOT treat a failed, pending or cancelled payment as a completed order.
          const hasPaidOrder = dbOrders.some(o => {
            const status = String(o.payment_status || '').toLowerCase().trim();
            return status === 'paid';
          });
          if (hasPaidOrder) {
            return true;
          }
        }
      }
    } catch (dbErr) {
      console.warn('Supabase previous order check notice:', dbErr);
    }

    // 2. Query in-memory orders cache
    if (userId || cleanEmail) {
      const hasPaidInMem = orders.some(o => {
        const orderEmail = (o.customer?.email || '').toLowerCase().trim();
        const orderUserId = o.userId || (o as any).user_id;
        const matchesUser = (userId && orderUserId === userId) || (cleanEmail && orderEmail === cleanEmail);
        const isPaid = String(o.paymentStatus || '').toLowerCase().trim() === 'paid';
        return matchesUser && isPaid;
      });
      if (hasPaidInMem) {
        return true;
      }
    }

    return false;
  }

  // Helper to validate coupon rules
  async function validateCoupon(
    couponCode: string,
    subtotal: number,
    identifier: { userId?: string | null; email?: string | null }
  ): Promise<{
    valid: boolean;
    message: string;
    code?: string;
    discountPercentage?: number;
    discountAmount?: number;
    subtotal?: number;
    taxes?: number;
    total?: number;
  }> {
    const normalizedCode = (couponCode || '').trim().toUpperCase();

    if (!normalizedCode) {
      return { valid: false, message: 'Please enter a coupon code.' };
    }

    if (normalizedCode !== 'NEW10') {
      return { valid: false, message: 'Invalid coupon code. Please verify and try again.' };
    }

    // Check if customer has already completed an order
    const hasPriorOrder = await hasCompletedPreviousOrders(identifier);
    if (hasPriorOrder) {
      return {
        valid: false,
        message: 'NEW10 is valid only for your first order.',
      };
    }

    const validSubtotal = Math.max(0, Number(subtotal) || 0);
    const discountAmount = Math.round(validSubtotal * 0.10);
    const taxableAmount = Math.max(0, validSubtotal - discountAmount);
    const taxes = Math.round(taxableAmount * 0.18);
    const total = taxableAmount + taxes; // Shipping is FREE

    return {
      valid: true,
      message: '10% first-order discount applied successfully!',
      code: 'NEW10',
      discountPercentage: 10,
      discountAmount,
      subtotal: validSubtotal,
      taxes,
      total,
    };
  }

  // 10.1 POST Validate Coupon (Public / Customer)
  app.post('/api/coupons/validate', couponLimiter, async (req, res) => {
    try {
      const validation = CouponValidateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          valid: false,
          message: validation.error.issues[0]?.message || 'Invalid coupon request parameters',
          details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }

      const { couponCode, subtotal, customerEmail, email, customerId, userId } = validation.data;

      // Extract user from Supabase JWT if present
      let authUser: any = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const auth = await verifySupabaseAuth(req);
        if (auth.user) authUser = auth.user;
      }

      const effectiveUserId = authUser?.id || userId || customerId || null;
      const effectiveEmail = authUser?.email || customerEmail || email || null;

      const result = await validateCoupon(couponCode, Number(subtotal) || 0, {
        userId: effectiveUserId,
        email: effectiveEmail,
      });

      if (!result.valid) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      res.status(500).json({ valid: false, message: err.message || 'Error validating coupon code.' });
    }
  });

  // 11. POST Checkout / Create Verified Order (Order Placement)
  app.post('/api/checkout', paymentLimiter, async (req, res) => {
    // Optional auth token validation for linking user account
    let authUser: any = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const auth = await verifySupabaseAuth(req);
      if (auth.user) {
        authUser = auth.user;
      }
    }

    const incomingPayload = req.body.order || req.body;
    if (!incomingPayload) {
      return res.status(400).json({ error: 'Order payload required' });
    }

    const validation = CheckoutOrderSchema.safeParse(incomingPayload);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid order parameters',
        details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const incomingOrder = validation.data;
    const orderId = incomingOrder.id || `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerName = incomingOrder.customer?.name || (authUser ? (authUser.user_metadata?.full_name || authUser.email?.split('@')[0]) : 'Client');
    const customerEmail = (authUser?.email || incomingOrder.customer?.email || 'client@example.com').trim().toLowerCase();
    const userId = authUser?.id || incomingOrder.userId || incomingOrder.user_id || null;

    let subtotal = Number(incomingOrder.subtotal) || 0;
    let couponCode = (incomingOrder.couponCode || incomingOrder.coupon_code || '').trim().toUpperCase() || undefined;
    let discountAmount = Number(incomingOrder.discountAmount || incomingOrder.discount_amount) || 0;
    let discountPercentage = incomingOrder.discountPercentage;

    // Server-Side Coupon Verification on Order Finalization
    if (couponCode === 'NEW10') {
      const couponCheck = await validateCoupon(couponCode, subtotal, {
        userId,
        email: customerEmail,
      });
      if (couponCheck.valid) {
        discountAmount = couponCheck.discountAmount || Math.round(subtotal * 0.10);
        discountPercentage = 10;
      } else {
        // Reject invalid / reused coupon on server
        couponCode = undefined;
        discountAmount = 0;
        discountPercentage = undefined;
      }
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxes = Math.round(taxableAmount * 0.18);
    const shipping = Number(incomingOrder.shipping) || 0;
    const total = taxableAmount + taxes + shipping;

    const newOrder: Order = {
      id: orderId,
      userId,
      customer: {
        name: customerName,
        email: customerEmail,
        avatarInitials: (customerName || 'CL').split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CL',
      },
      date: incomingOrder.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      items: incomingOrder.items as any,
      subtotal,
      discountAmount,
      discount_amount: discountAmount,
      couponCode,
      coupon_code: couponCode,
      discountPercentage,
      shipping,
      taxes,
      total,
      paymentMethod: incomingOrder.paymentMethod as any,
      paymentStatus: incomingOrder.paymentStatus as any,
      fulfillmentStatus: incomingOrder.fulfillmentStatus as any,
      shippingAddress: incomingOrder.shippingAddress || {
        phone: '',
        pincode: '',
        landmark: '',
        city: '',
        state: '',
        addressLine: '',
      },
      shippingMethod: incomingOrder.shippingMethod || 'Complimentary Express Courier (3-5 Business Days)',
      timeline: incomingOrder.timeline || [
        { key: 'placed', title: 'ORDER PLACED', subtitle: 'Just now', completed: true, current: false },
        { key: 'confirmed', title: 'CONFIRMED', subtitle: 'Payment Verified', completed: true, current: false },
        { key: 'atelier', title: 'AT THE ATELIER', subtitle: 'Cutting & Stitching in Progress', completed: false, current: true },
        { key: 'dispatched', title: 'DISPATCHED', subtitle: 'Pending completion', completed: false, current: false },
      ],
    };

    newOrder.shippingLabel = {
      ...(incomingOrder.shippingLabel || generateShippingLabelData(newOrder, undefined, products)),
      couponCode: couponCode || null,
      discountAmount: discountAmount || 0,
      discountPercentage: discountPercentage || null,
    };

    // Persist directly into Supabase database
    try {
      const orderPayload = {
        id: newOrder.id,
        user_id: userId,
        customer_name: newOrder.customer.name,
        customer_email: newOrder.customer.email,
        customer_avatar: newOrder.customer.avatarInitials,
        order_date: newOrder.date,
        subtotal: newOrder.subtotal,
        shipping: newOrder.shipping,
        taxes: newOrder.taxes,
        total: newOrder.total,
        payment_method: newOrder.paymentMethod,
        payment_status: newOrder.paymentStatus,
        fulfillment_status: newOrder.fulfillmentStatus,
        shipping_address: newOrder.shippingAddress,
        shipping_method: newOrder.shippingMethod,
        timeline: newOrder.timeline,
        shipping_label: newOrder.shippingLabel,
      };

      const { error: upsertErr } = await supabase.from('orders').upsert(orderPayload);
      if (upsertErr && upsertErr.code === '23503' && orderPayload.user_id) {
        await supabase.from('orders').upsert({
          ...orderPayload,
          user_id: null,
        });
      }

      if (newOrder.items && newOrder.items.length > 0) {
        const itemsPayload = newOrder.items.map((it: any) => ({
          order_id: newOrder.id,
          product_id: it.productId || it.id || null,
          product_name: it.productName || 'Bespoke Piece',
          product_image: it.productImage || '',
          sku: it.sku || it.skuId || 'SB-001',
          color_name: it.colorName || '',
          price: it.price || 0,
          quantity: it.quantity || 1,
          monogram: it.monogram || null,
          foil_color: it.foilColor || null,
        }));
        await supabase.from('order_items').upsert(itemsPayload);
      }
    } catch (dbErr) {
      console.warn('Supabase checkout upsert notice:', dbErr);
    }

    const existingIdx = orders.findIndex(o => o.id === newOrder.id);
    if (existingIdx >= 0) {
      orders[existingIdx] = newOrder;
    } else {
      orders.unshift(newOrder);
    }

    // Return ONLY the placed order - strictly never leak other orders
    res.status(201).json({ success: true, order: newOrder, shippingLabel: newOrder.shippingLabel });
  });

  // ================= RAZORPAY PAYMENT ENDPOINTS =================

  // 12. GET Public Razorpay Key ID (Public)
  app.get('/api/payments/key', (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    if (!keyId) {
      return res.status(500).json({
        success: false,
        error: 'RAZORPAY_KEY_ID environment variable is not configured on the server.',
      });
    }
    res.json({
      success: true,
      keyId,
      isTestMode: keyId.startsWith('rzp_test_'),
    });
  });

  // 13. POST Create Razorpay Order (Public / Customer)
  // SERVER-SIDE VALIDATION: Independently calculates payable amount & verifies coupon
  app.post('/api/payments/create-order', paymentLimiter, async (req, res) => {
    try {
      const validation = RazorpayCreateOrderSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment parameters',
          details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }

      const { amount, subtotal, couponCode, currency = 'INR', receipt, notes, customer } = validation.data;

      // Extract auth user if available
      let authUser: any = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const auth = await verifySupabaseAuth(req);
        if (auth.user) authUser = auth.user;
      }

      const effectiveUserId = authUser?.id || req.body.userId || null;
      const effectiveEmail = authUser?.email || customer?.email || req.body.customerEmail || null;

      let payableAmount = Number(amount) || 0;
      let appliedCoupon: string | null = null;
      let calculatedDiscount = 0;

      // SERVER-SIDE COUPON VALIDATION & CALCULATION BEFORE RAZORPAY ORDER CREATION:
      if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
        const parsedSubtotal = Number(subtotal) > 0 ? Number(subtotal) : (payableAmount > 0 ? Math.round(payableAmount / 1.18) : 0);
        
        const couponCheck = await validateCoupon(couponCode, parsedSubtotal, {
          userId: effectiveUserId,
          email: effectiveEmail,
        });

        if (!couponCheck.valid) {
          return res.status(400).json({
            success: false,
            error: couponCheck.message,
            couponError: true,
          });
        }

        appliedCoupon = couponCheck.code || 'NEW10';
        calculatedDiscount = couponCheck.discountAmount || 0;
        payableAmount = couponCheck.total || payableAmount;
      }

      if (!payableAmount || payableAmount <= 0) {
        return res.status(400).json({ error: 'Valid payment amount is required' });
      }

      const keyId = process.env.RAZORPAY_KEY_ID?.trim();
      const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

      if (!keyId || !keySecret) {
        return res.status(500).json({
          success: false,
          error: 'Payment gateway configuration error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured on the server.',
        });
      }

      const amountInPaise = payableAmount < 500000 ? Math.round(payableAmount * 100) : Math.round(payableAmount);
      const orderReceipt = (receipt || `rcpt_${Date.now()}`).substring(0, 40);

      const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: (currency || 'INR').toUpperCase(),
          receipt: orderReceipt,
          payment_capture: 1,
          notes: {
            brand: 'STUNNING BIRDS ATELIER',
            customer_name: customer?.name || 'Valued Patron',
            customer_email: effectiveEmail || customer?.email || '',
            ...(appliedCoupon ? { coupon_code: appliedCoupon, discount_amount: String(calculatedDiscount) } : {}),
            ...notes,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.error?.description || 'Failed to create Razorpay order',
          details: errorData,
        });
      }

      const orderData = await response.json();
      return res.json({
        success: true,
        orderId: orderData.id,
        amount: orderData.amount,
        finalPayableAmount: payableAmount,
        discountAmount: calculatedDiscount,
        couponCode: appliedCoupon,
        currency: orderData.currency,
        keyId,
        receipt: orderData.receipt,
        status: orderData.status,
        isTestMode: keyId.startsWith('rzp_test_'),
        notes: orderData.notes,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // 14. GET Fetch Enabled Razorpay Payment Methods (Public)
  app.get('/api/payments/methods', async (req, res) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID?.trim();
      if (!keyId) {
        return res.status(500).json({
          success: false,
          error: 'RAZORPAY_KEY_ID environment variable is not configured on the server.',
        });
      }
      const response = await fetch(`https://api.razorpay.com/v1/methods?key_id=${encodeURIComponent(keyId)}`);
      const data = await response.json();
      res.json({
        keyId,
        isTestMode: keyId.startsWith('rzp_test_'),
        methods: data,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // 15. POST Verify Razorpay Payment Signature (Public / Customer)
  app.post('/api/payments/verify', paymentLimiter, (req, res) => {
    try {
      const validation = RazorpayVerifySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Missing or invalid mandatory payment verification parameters',
          details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;

      const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
      if (!keySecret) {
        return res.status(500).json({
          success: false,
          verified: false,
          error: 'Payment verification failed: RAZORPAY_KEY_SECRET is not configured on the server.',
        });
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const isMatch =
        generatedSignature.length === razorpay_signature.length &&
        crypto.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(razorpay_signature));

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Invalid Razorpay payment signature',
        });
      }

      return res.json({
        success: true,
        verified: true,
        message: 'Razorpay payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // 16. GET Shipping Label for an Order (PROTECTED: Admin or Order Owner ONLY)
  app.get('/api/orders/:id/shipping-label', requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;
    const authToken = (req as any).authToken;
    const client = getScopedSupabase(authToken);

    const targetIds = Array.from(new Set([id, id.replace(/^#/, ''), `#${id.replace(/^#/, '')}`])).filter(Boolean);

    try {
      const { data: dbOrders } = await client.from('orders').select('*, order_items(*)').in('id', targetIds);
      let orderRow = dbOrders && dbOrders.length > 0 ? dbOrders[0] : null;
      let order = orderRow ? mapSupabaseOrder(orderRow) : orders.find(o => targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, '')));

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!isAdmin) {
        const userEmail = (user.email || '').toLowerCase().trim();
        const orderEmail = (order.customer?.email || '').toLowerCase().trim();
        const orderUserId = (orderRow as any)?.user_id || (order as any).userId;
        if (orderEmail !== userEmail && orderUserId !== user.id) {
          return res.status(403).json({ error: 'Forbidden: You can only access shipping labels for your own orders.' });
        }
      }

      if (!order.shippingLabel) {
        order.shippingLabel = generateShippingLabelData(order, undefined, products);
      }

      res.json({ success: true, shippingLabel: order.shippingLabel, orderId: order.id });
    } catch (e: any) {
      res.status(500).json({ error: 'Error generating shipping label' });
    }
  });

  // 17. GET Tax Invoice Data for an Order (PROTECTED: Admin or Order Owner ONLY)
  app.get('/api/orders/:id/invoice', requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;
    const authToken = (req as any).authToken;
    const client = getScopedSupabase(authToken);

    const targetIds = Array.from(new Set([id, id.replace(/^#/, ''), `#${id.replace(/^#/, '')}`])).filter(Boolean);

    try {
      const { data: dbOrders } = await client.from('orders').select('*, order_items(*)').in('id', targetIds);
      let orderRow = dbOrders && dbOrders.length > 0 ? dbOrders[0] : null;
      let order = orderRow ? mapSupabaseOrder(orderRow) : orders.find(o => targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, '')));

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!isAdmin) {
        const userEmail = (user.email || '').toLowerCase().trim();
        const orderEmail = (order.customer?.email || '').toLowerCase().trim();
        const orderUserId = (orderRow as any)?.user_id || (order as any).userId;
        if (orderEmail !== userEmail && orderUserId !== user.id) {
          return res.status(403).json({
            error: 'Forbidden: You can only access and download tax invoices for your own orders.',
          });
        }
      }

      if (!order.shippingLabel) {
        order.shippingLabel = generateShippingLabelData(order, undefined, products);
      }

      const safeItems = Array.isArray(order.items) ? order.items : [];
      const itemsTaxableSum = safeItems.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18, 0);
      const itemsTaxSum = safeItems.reduce((acc, it) => acc + (((Number(it.price) || 0) * (Number(it.quantity) || 1)) - ((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18), 0);
      const deliveryCharge = order.shipping || 0;
      const deliveryTaxable = deliveryCharge > 0 ? deliveryCharge / 1.18 : 0;
      const deliveryTax = deliveryCharge > 0 ? deliveryCharge - deliveryTaxable : 0;

      res.json({
        success: true,
        orderId: order.id,
        invoiceNumber: order.shippingLabel.invoiceNumber || `INV-${order.id.replace('#', '')}`,
        invoiceDate: order.shippingLabel.invoiceDate || order.date,
        orderDate: order.date,
        customer: order.customer,
        shippingAddress: order.shippingAddress,
        billingAddress: order.shippingAddress,
        items: order.items,
        subtotalTaxable: itemsTaxableSum + deliveryTaxable,
        taxAmount: itemsTaxSum + deliveryTax,
        shippingCharge: deliveryCharge,
        grandTotal: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        seller: {
          name: 'STUNNING BIRDS ATELIER',
          registeredName: 'Stunning Birds Atelier Private Limited',
          address: '142/B 100 Feet Road, Indiranagar, Bengaluru, Karnataka, 560038',
          gstin: '29AABCU9603R1ZM',
          pan: 'AABCU9603R',
          phone: '+91 80 4912 8800',
          email: 'concierge@stunningbirds.com',
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Error generating invoice' });
    }
  });

  // 18. POST Regenerate Shipping Label (ADMIN ONLY)
  app.post('/api/orders/:id/shipping-label/regenerate', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const authToken = (req as any).authToken;
    const client = getScopedSupabase(authToken);
    const targetIds = Array.from(new Set([id, id.replace(/^#/, ''), `#${id.replace(/^#/, '')}`])).filter(Boolean);

    try {
      const { data: dbOrders } = await client.from('orders').select('*, order_items(*)').in('id', targetIds);
      if (!dbOrders || dbOrders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = mapSupabaseOrder(dbOrders[0]);
      const newLabel = generateShippingLabelData(order, undefined, products);
      order.shippingLabel = newLabel;

      await client.from('orders').update({ shipping_label: newLabel }).in('id', targetIds);

      res.json({ success: true, shippingLabel: newLabel, message: 'Shipping label regenerated successfully' });
    } catch (e: any) {
      res.status(500).json({ error: 'Error regenerating shipping label' });
    }
  });

  // 19. PATCH Order status (ADMIN ONLY)
  app.patch('/api/orders/:id/status', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const validation = OrderStatusPatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid order status parameters',
        details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { fulfillmentStatus, paymentStatus } = validation.data;
    const targetIds = Array.from(new Set([id, id.replace(/^#/, ''), `#${id.replace(/^#/, '')}`])).filter(Boolean);
    const authToken = (req as any).authToken;
    const client = getScopedSupabase(authToken);

    try {
      const updatePayload: any = {};
      if (fulfillmentStatus) {
        updatePayload.fulfillment_status = fulfillmentStatus;
        if (fulfillmentStatus === 'CANCELLED') {
          updatePayload.timeline = [
            { key: 'placed', title: 'ORDER PLACED', subtitle: 'Order Received', completed: true, current: false },
            { key: 'cancelled', title: 'ORDER CANCELLED', subtitle: 'Cancelled by Atelier Administrator', completed: true, current: true, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
          ];
        }
      }
      if (paymentStatus) updatePayload.payment_status = paymentStatus;

      const { data: updatedRows, error } = await client
        .from('orders')
        .update(updatePayload)
        .in('id', targetIds)
        .select('*, order_items(*)');

      // Update in-memory orders
      orders = orders.map(o => {
        if (targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, ''))) {
          return {
            ...o,
            ...(fulfillmentStatus ? { fulfillmentStatus: fulfillmentStatus as any } : {}),
            ...(paymentStatus ? { paymentStatus: paymentStatus as any } : {}),
          };
        }
        return o;
      });

      if (!error && updatedRows && updatedRows.length > 0) {
        const updatedOrder = mapSupabaseOrder(updatedRows[0]);
        return res.json({ order: updatedOrder });
      }

      const inMemoryFound = orders.find(o => targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, '')));
      if (inMemoryFound) {
        return res.json({ order: inMemoryFound });
      }

      return res.status(404).json({ error: 'Order not found or update failed' });
    } catch (e: any) {
      res.status(500).json({ error: 'Error updating order status' });
    }
  });

  // 19.0.1 POST /api/admin/orders/bulk-status & /api/orders/bulk-status (ADMIN ONLY)
  const handleBulkOrderStatusUpdate = async (req: express.Request, res: express.Response) => {
    const user = (req as any).user;
    const authToken = (req as any).authToken;
    const validation = BulkOrderStatusPatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bulk order status parameters',
        details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { orderIds, fulfillmentStatus, reason, note } = validation.data;
    const targetStatus = fulfillmentStatus.toUpperCase();
    const client = getServiceSupabase() || getScopedSupabase(authToken);

    try {
      // 1. Resolve all requested order IDs (handling with or without #)
      const cleanIdsMap = new Map<string, string[]>();
      const allQueryIds: string[] = [];

      for (const id of orderIds) {
        const clean = id.replace(/^#/, '').trim();
        const variants = Array.from(new Set([id, clean, `#${clean}`])).filter(Boolean);
        cleanIdsMap.set(id, variants);
        allQueryIds.push(...variants);
      }

      // 2. Query Supabase for existing orders
      const { data: dbOrders, error: fetchErr } = await client
        .from('orders')
        .select('*, order_items(*)')
        .in('id', Array.from(new Set(allQueryIds)));

      if (fetchErr) {
        console.error('Supabase bulk orders fetch error:', fetchErr);
        return res.status(500).json({
          success: false,
          error: fetchErr.message || 'Database error fetching selected orders.',
        });
      }

      const foundOrders: any[] = dbOrders || [];
      const updatedOrderIds: string[] = [];
      const failedOrders: Array<{ id: string; reason: string }> = [];

      for (const originalId of orderIds) {
        const variants = cleanIdsMap.get(originalId) || [originalId];
        const matchedRow = foundOrders.find(o => variants.includes(o.id));
        const matchedInMemory = orders.find(o => variants.includes(o.id) || variants.includes(o.id.replace(/^#/, '')));

        if (!matchedRow && !matchedInMemory) {
          failedOrders.push({ id: originalId, reason: 'Order not found in database' });
          continue;
        }

        const currentFulfillment = (
          (matchedRow ? (matchedRow.fulfillment_status || matchedRow.fulfillmentStatus) : matchedInMemory?.fulfillmentStatus) || 'PROCESSING'
        ).toUpperCase();

        // 3. Status Transition Validations:
        // Case A: Transitioning to CANCELLED
        if (targetStatus === 'CANCELLED') {
          if (currentFulfillment === 'CANCELLED') {
            failedOrders.push({ id: originalId, reason: 'Already Cancelled' });
            continue;
          }
          if (currentFulfillment === 'SHIPPED') {
            failedOrders.push({ id: originalId, reason: 'Cannot cancel: already Shipped' });
            continue;
          }
          if (currentFulfillment === 'DELIVERED') {
            failedOrders.push({ id: originalId, reason: 'Cannot cancel: already Delivered' });
            continue;
          }
          if (currentFulfillment !== 'PROCESSING' && currentFulfillment !== 'CRAFTING') {
            failedOrders.push({ id: originalId, reason: `Cannot cancel from '${currentFulfillment}'` });
            continue;
          }
        }

        // Case B: Transitioning from CANCELLED to active (Processing, Crafting, Shipped, Delivered)
        if (currentFulfillment === 'CANCELLED' && targetStatus !== 'CANCELLED') {
          failedOrders.push({ id: originalId, reason: 'Cancelled orders cannot be directly moved to active status' });
          continue;
        }

        // Case C: Target status is identical to current
        if (currentFulfillment === targetStatus) {
          updatedOrderIds.push(originalId);
          continue;
        }

        // 4. Generate updated timeline
        const orderDate = matchedRow?.order_date || matchedInMemory?.date || new Date().toISOString();
        const parsedLabel = typeof matchedRow?.shipping_label === 'string' ? JSON.parse(matchedRow.shipping_label) : (matchedRow?.shipping_label || matchedInMemory?.shippingLabel);
        const awb = parsedLabel?.awbNumber;

        let updatedTimeline: any[];
        if (targetStatus === 'CANCELLED') {
          const cancelSubtitle = note
            ? `Cancelled by Atelier Management (${reason || 'Administrative'}: ${note})`
            : (reason ? `Cancelled by Atelier Management (${reason})` : 'Cancelled by Atelier Administrator');

          const baseTimeline = (matchedRow?.timeline || matchedInMemory?.timeline || []).map((t: any) => ({ ...t, current: false }));
          updatedTimeline = [
            ...(baseTimeline.length > 0 ? baseTimeline.filter((t: any) => t.key !== 'cancelled') : [{ key: 'placed', title: 'ORDER PLACED', subtitle: orderDate, completed: true, current: false }]),
            {
              key: 'cancelled',
              title: 'ORDER CANCELLED',
              subtitle: cancelSubtitle,
              completed: true,
              current: true,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            }
          ];
        } else {
          let step = 0;
          if (targetStatus === 'PROCESSING') step = 0;
          else if (targetStatus === 'CRAFTING') step = 1;
          else if (targetStatus === 'SHIPPED') step = 2;
          else if (targetStatus === 'DELIVERED') step = 3;

          updatedTimeline = [
            {
              key: 'placed',
              title: 'ORDER PLACED',
              subtitle: orderDate,
              completed: true,
              current: step === 0,
            },
            {
              key: 'crafting',
              title: 'AT THE ATELIER',
              subtitle: step > 1 ? 'Crafting Completed' : (step === 1 ? 'Cutting & Stitching in Progress' : 'Queued for Crafting'),
              completed: step >= 1,
              current: step === 1,
            },
            {
              key: 'shipped',
              title: 'DISPATCHED',
              subtitle: step > 2 ? 'Dispatched via Express Courier' : (step === 2 ? (awb ? `In Transit (${awb})` : 'In Transit via Express Courier') : 'Pending Dispatch'),
              completed: step >= 2,
              current: step === 2,
            },
            {
              key: 'delivered',
              title: 'DELIVERED',
              subtitle: step === 3 ? 'Safely Delivered to Patron' : 'Estimated Delivery (3-5 Days)',
              completed: step === 3,
              current: step === 3,
            },
          ];
        }

        // 5. Perform the database update for this order in Supabase
        // Crucial: Only fulfillment_status, timeline, and updated_at are updated.
        // Payment status, order total, customer info, order items, Razorpay info are strictly preserved.
        const updatePayload = {
          fulfillment_status: targetStatus,
          timeline: updatedTimeline,
          updated_at: new Date().toISOString(),
        };

        if (matchedRow) {
          const { error: updErr } = await client
            .from('orders')
            .update(updatePayload)
            .in('id', variants);

          if (updErr) {
            console.error(`Error updating order ${originalId} in Supabase:`, updErr);
            failedOrders.push({ id: originalId, reason: updErr.message || 'Database update failed' });
            continue;
          }
        }

        // Update in-memory orders cache
        orders = orders.map(o => {
          if (variants.includes(o.id) || variants.includes(o.id.replace(/^#/, ''))) {
            return {
              ...o,
              fulfillmentStatus: targetStatus as any,
              timeline: updatedTimeline,
            };
          }
          return o;
        });

        updatedOrderIds.push(originalId);
      }

      const updatedCount = updatedOrderIds.length;
      const failedCount = failedOrders.length;

      // Status label for feedback
      const formattedStatus = targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1).toLowerCase();

      let feedbackMessage = '';
      if (updatedCount > 0 && failedCount === 0) {
        feedbackMessage = `${updatedCount} order${updatedCount > 1 ? 's' : ''} updated to ${formattedStatus}`;
      } else if (updatedCount > 0 && failedCount > 0) {
        feedbackMessage = `${updatedCount} order${updatedCount > 1 ? 's' : ''} updated to ${formattedStatus}, ${failedCount} failed`;
      } else {
        const firstReason = failedOrders[0]?.reason ? `: ${failedOrders[0].reason}` : '';
        feedbackMessage = `Failed to update selected orders${firstReason}`;
      }

      return res.json({
        success: updatedCount > 0,
        updatedCount,
        failedCount,
        updatedOrderIds,
        failedOrders,
        fulfillmentStatus: targetStatus,
        message: feedbackMessage,
      });
    } catch (err: any) {
      console.error('Unexpected error in handleBulkOrderStatusUpdate:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'An unexpected error occurred during bulk order status update.',
      });
    }
  };

  app.post('/api/orders/bulk-status', sensitiveActionLimiter, requireAdmin, handleBulkOrderStatusUpdate);
  app.post('/api/admin/orders/bulk-status', sensitiveActionLimiter, requireAdmin, handleBulkOrderStatusUpdate);
  app.patch('/api/admin/orders/bulk-status', sensitiveActionLimiter, requireAdmin, handleBulkOrderStatusUpdate);

  // 19.1 POST Cancel Order (AUTHENTICATED CUSTOMER OR ADMIN)
  app.post('/api/orders/:id/cancel', sensitiveActionLimiter, requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;
    const authToken = (req as any).authToken;

    const validation = OrderCancelSchema.safeParse(req.body);
    const reason = validation.success && validation.data.reason ? validation.data.reason.trim() : 'Cancelled by Patron';
    const note = validation.success && validation.data.note ? validation.data.note.trim() : '';

    const cleanId = id.replace(/^#/, '').trim();
    const targetIds = Array.from(new Set([id, cleanId, `#${cleanId}`])).filter(Boolean);

    const client = getScopedSupabase(authToken);

    try {
      // 1. Fetch order from Supabase with user token
      let orderRow: any = null;
      const { data: existingRows, error: fetchErr } = await client
        .from('orders')
        .select('*, order_items(*)')
        .in('id', targetIds);

      if (!fetchErr && existingRows && existingRows.length > 0) {
        orderRow = existingRows[0];
      }

      // Check in-memory fallback
      let inMemoryOrder = orders.find(o => targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, '')));

      if (!orderRow && !inMemoryOrder) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      // 2. Ownership verification: must match authenticated user's ID or email, unless admin
      if (orderRow) {
        const orderUserId = orderRow.user_id;
        const orderEmail = (orderRow.customer_email || '').toLowerCase().trim();
        const userEmail = (user.email || '').toLowerCase().trim();
        const isOwner = (orderUserId && orderUserId === user.id) || (orderEmail && userEmail && orderEmail === userEmail);

        if (!isOwner && !isAdmin) {
          return res.status(404).json({ success: false, error: 'Order not found.' });
        }
      } else if (inMemoryOrder) {
        const orderUserId = (inMemoryOrder as any).userId || (inMemoryOrder as any).user_id;
        const orderEmail = (inMemoryOrder.customer?.email || '').toLowerCase().trim();
        const userEmail = (user.email || '').toLowerCase().trim();
        const isOwner = (orderUserId && orderUserId === user.id) || (orderEmail && userEmail && orderEmail === userEmail);

        if (!isOwner && !isAdmin) {
          return res.status(404).json({ success: false, error: 'Order not found.' });
        }
      }

      // 3. Read ACTUAL fulfillment_status and verify cancellation eligibility
      const currentFulfillment = (
        (orderRow ? (orderRow.fulfillment_status || orderRow.fulfillmentStatus) : inMemoryOrder?.fulfillmentStatus) || 'PROCESSING'
      ).toUpperCase();

      if (currentFulfillment === 'CANCELLED') {
        return res.status(400).json({ success: false, error: 'This order has already been cancelled.' });
      }

      if (currentFulfillment === 'SHIPPED') {
        return res.status(400).json({
          success: false,
          error: 'This order can no longer be cancelled because it has been shipped.',
        });
      }

      if (currentFulfillment === 'DELIVERED') {
        return res.status(400).json({
          success: false,
          error: 'This order can no longer be cancelled because it has been delivered.',
        });
      }

      if (currentFulfillment !== 'PROCESSING' && currentFulfillment !== 'CRAFTING') {
        return res.status(400).json({
          success: false,
          error: `Orders with status '${currentFulfillment}' cannot be cancelled. Only orders in PROCESSING or CRAFTING status can be cancelled.`,
        });
      }

      // 4. Prepare cancellation timeline event
      const cancellationSubtitle = note
        ? `Cancelled (${reason}: ${note})`
        : (reason ? `Cancelled (${reason})` : 'Cancelled at Patron Request');

      const existingTimeline = orderRow
        ? (Array.isArray(orderRow.timeline) && orderRow.timeline.length > 0 ? orderRow.timeline : [])
        : (inMemoryOrder && Array.isArray(inMemoryOrder.timeline) && inMemoryOrder.timeline.length > 0 ? inMemoryOrder.timeline : []);

      const baseTimeline = existingTimeline.length > 0
        ? existingTimeline.map((s: any) => ({ ...s, current: false }))
        : [
            {
              key: 'placed',
              title: 'ORDER PLACED',
              subtitle: (orderRow?.order_date || inMemoryOrder?.date || 'Order Received'),
              completed: true,
              current: false,
            },
          ];

      const updatedTimeline = [
        ...baseTimeline.filter((t: any) => t.key !== 'cancelled'),
        {
          key: 'cancelled',
          title: 'ORDER CANCELLED',
          subtitle: cancellationSubtitle,
          completed: true,
          current: true,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        },
      ];

      let updatedOrderResult: Order | null = null;

      // 5. ATOMIC conditional database update in Supabase
      if (orderRow) {
        let updateQuery = client
          .from('orders')
          .update({
            fulfillment_status: 'CANCELLED',
            timeline: updatedTimeline,
          })
          .in('id', targetIds)
          .in('fulfillment_status', ['PROCESSING', 'CRAFTING']);

        if (!isAdmin && orderRow.user_id) {
          updateQuery = updateQuery.eq('user_id', user.id);
        }

        const { data: updatedRows, error: updateErr } = await updateQuery.select('*, order_items(*)');

        if (updateErr) {
          console.error('Supabase order cancellation update error:', updateErr);
          return res.status(500).json({ success: false, error: updateErr.message || 'Failed to update order status in database.' });
        }

        if (!updatedRows || updatedRows.length === 0) {
          // Check if status changed in the interim
          const { data: freshCheck } = await client.from('orders').select('fulfillment_status').in('id', targetIds).maybeSingle();
          if (freshCheck) {
            const freshStatus = (freshCheck.fulfillment_status || '').toUpperCase();
            if (freshStatus === 'SHIPPED') {
              return res.status(400).json({ success: false, error: 'This order can no longer be cancelled because it has been shipped.' });
            }
            if (freshStatus === 'DELIVERED') {
              return res.status(400).json({ success: false, error: 'This order can no longer be cancelled because it has been delivered.' });
            }
            if (freshStatus === 'CANCELLED') {
              return res.status(400).json({ success: false, error: 'This order has already been cancelled.' });
            }
          }
          return res.status(409).json({
            success: false,
            error: 'The order status changed before cancellation could be completed. Please refresh the order.',
          });
        }

        updatedOrderResult = mapSupabaseOrder(updatedRows[0]);
      }

      // 6. Update in-memory orders array
      orders = orders.map(o => {
        if (targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, ''))) {
          return {
            ...o,
            fulfillmentStatus: 'CANCELLED',
            timeline: updatedTimeline,
          };
        }
        return o;
      });

      if (!updatedOrderResult && inMemoryOrder) {
        const found = orders.find(o => targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, '')));
        if (found) {
          updatedOrderResult = found;
        }
      }

      return res.json({
        success: true,
        message: `Order ${cleanId} has been successfully cancelled.`,
        order: updatedOrderResult,
      });
    } catch (e: any) {
      console.error('Unexpected error during order cancellation:', e);
      return res.status(500).json({ success: false, error: 'An unexpected server error occurred during cancellation.' });
    }
  });

  // 19.2 POST Mark Cancelled Prepaid Order as Refunded (ADMIN ONLY - MANUAL RAZORPAY REFUND RECORD)
  const handleMarkOrderRefunded = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const authToken = (req as any).authToken;
    const cleanId = id.replace(/^#/, '').trim();
    const targetIds = Array.from(new Set([id, cleanId, `#${cleanId}`])).filter(Boolean);

    const client = getScopedSupabase(authToken);

    try {
      // 1. Fetch order from Supabase
      let orderRow: any = null;
      const { data: existingRows, error: fetchErr } = await client
        .from('orders')
        .select('*, order_items(*)')
        .in('id', targetIds);

      if (!fetchErr && existingRows && existingRows.length > 0) {
        orderRow = existingRows[0];
      }

      // Check in-memory fallback
      const inMemoryOrder = orders.find(o => targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, '')));

      if (!orderRow && !inMemoryOrder) {
        return res.status(404).json({ success: false, error: `Order '${cleanId}' not found.` });
      }

      const currentFulfillment = (
        (orderRow ? (orderRow.fulfillment_status || orderRow.fulfillmentStatus) : inMemoryOrder?.fulfillmentStatus) || 'PROCESSING'
      ).toUpperCase();

      const currentPaymentMethod = (
        orderRow ? (orderRow.payment_method || orderRow.paymentMethod) : inMemoryOrder?.paymentMethod
      ) || '';

      const currentPaymentStatus = (
        orderRow ? (orderRow.payment_status || orderRow.paymentStatus) : inMemoryOrder?.paymentStatus
      ) || 'Pending';

      // 2. Validate cancelled status (Strict requirement: only cancelled orders)
      if (currentFulfillment !== 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: `Only cancelled orders can be marked as refunded. Current fulfillment status is '${currentFulfillment}'.`,
        });
      }

      // 3. Validate payment method: only prepaid Razorpay / online orders (NOT COD)
      const m = currentPaymentMethod.toLowerCase().trim();
      const isCod = m.includes('cash on delivery') || m.includes('(cod)') || m === 'cod';
      if (isCod) {
        return res.status(400).json({
          success: false,
          error: 'Cannot mark Cash on Delivery (COD) orders as refunded. Only prepaid Razorpay / online orders are eligible.',
        });
      }

      // 4. Validate payment status: must be currently Paid, prevent marking twice
      if (currentPaymentStatus.toLowerCase() === 'refunded') {
        return res.status(400).json({
          success: false,
          error: 'This order has already been marked as refunded. Duplicate refund records are prevented.',
        });
      }

      if (currentPaymentStatus.toLowerCase() !== 'paid') {
        return res.status(400).json({
          success: false,
          error: `Only orders with payment status 'Paid' can be marked as refunded. Current payment status is '${currentPaymentStatus}'.`,
        });
      }

      let updatedOrderResult: Order | null = null;

      // 5. Update Supabase orders table: update payment_status to 'Refunded'
      // Note: All original amounts, Razorpay transaction details, items, addresses are preserved
      if (orderRow) {
        const { data: updatedRows, error: updateErr } = await client
          .from('orders')
          .update({
            payment_status: 'Refunded',
          })
          .in('id', targetIds)
          .select('*, order_items(*)');

        if (updateErr) {
          console.error('Supabase mark order refunded update error:', updateErr);
          return res.status(500).json({
            success: false,
            error: updateErr.message || 'Failed to update order payment status in database.',
          });
        }

        if (updatedRows && updatedRows.length > 0) {
          updatedOrderResult = mapSupabaseOrder(updatedRows[0]);
        }
      }

      // 6. Update in-memory orders state
      orders = orders.map(o => {
        if (targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, ''))) {
          return {
            ...o,
            paymentStatus: 'Refunded',
          };
        }
        return o;
      });

      if (!updatedOrderResult && inMemoryOrder) {
        const found = orders.find(o => targetIds.includes(o.id) || targetIds.includes(o.id.replace(/^#/, '')));
        if (found) {
          updatedOrderResult = found;
        }
      }

      return res.json({
        success: true,
        message: `Order ${cleanId} payment status successfully updated from Paid to Refunded.`,
        order: updatedOrderResult,
      });
    } catch (e: any) {
      console.error('Unexpected error during marking order as refunded:', e);
      return res.status(500).json({ success: false, error: 'An unexpected server error occurred while updating refund status.' });
    }
  };

  app.post('/api/orders/:id/mark-refunded', sensitiveActionLimiter, requireAdmin, handleMarkOrderRefunded);
  app.post('/api/admin/orders/:id/mark-refunded', sensitiveActionLimiter, requireAdmin, handleMarkOrderRefunded);

  // ==============================================================================
  // RETURN & REFUND MANAGEMENT SYSTEM API ENDPOINTS
  // ==============================================================================

  // Helper: Resolve delivery timestamp from order
  const resolveOrderDeliveryTimestamp = (order: any): { timestamp: number; formatted: string } => {
    let rawDate: any = order.delivered_at;
    if (!rawDate && Array.isArray(order.timeline)) {
      const deliveredStep = order.timeline.find((s: any) => s.key === 'delivered' || (s.title && s.title.toUpperCase().includes('DELIVERED')));
      if (deliveredStep?.date) {
        rawDate = deliveredStep.date;
      }
    }
    if (!rawDate) {
      rawDate = order.updated_at || order.created_at || order.date || new Date().toISOString();
    }
    const d = new Date(rawDate);
    const ts = !isNaN(d.getTime()) ? d.getTime() : Date.now();
    return {
      timestamp: ts,
      formatted: new Date(ts).toISOString(),
    };
  };

  // 19.1 POST /api/returns: Create customer return request (Strict 7-Day & 3-Reason Return Policy)
  app.post('/api/returns', sensitiveActionLimiter, requireAuth, async (req, res) => {
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;
    const authToken = (req as any).authToken;

    const validation = CreateReturnRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid return request payload.',
        details: validation.error.issues,
      });
    }

    const { orderId, orderItemId, productId, reason, description, evidenceEmailConfirmed } = validation.data;
    const cleanOrderId = orderId.replace(/^#/, '').trim();
    const targetOrderIds = Array.from(new Set([orderId, cleanOrderId, `#${cleanOrderId}`])).filter(Boolean);

    const client = getScopedSupabase(authToken);

    try {
      // 1. Fetch order from Supabase / Memory
      let orderRow: any = null;
      const { data: dbOrders, error: fetchErr } = await client
        .from('orders')
        .select('*, order_items(*)')
        .in('id', targetOrderIds);

      if (!fetchErr && dbOrders && dbOrders.length > 0) {
        orderRow = dbOrders[0];
      }

      const inMemoryOrder = orders.find(o => targetOrderIds.includes(o.id) || targetOrderIds.includes(o.id.replace(/^#/, '')));

      if (!orderRow && !inMemoryOrder) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      // 2. Ownership verification: authenticated user must own the order unless admin
      if (orderRow) {
        const orderUserId = orderRow.user_id;
        const orderEmail = (orderRow.customer_email || '').toLowerCase().trim();
        const userEmail = (user.email || '').toLowerCase().trim();
        const isOwner = (orderUserId && orderUserId === user.id) || (orderEmail && userEmail && orderEmail === userEmail);
        if (!isOwner && !isAdmin) {
          return res.status(403).json({ success: false, error: 'You are not authorized to request a return for this order.' });
        }
      } else if (inMemoryOrder) {
        const orderUserId = (inMemoryOrder as any).userId || (inMemoryOrder as any).user_id;
        const orderEmail = (inMemoryOrder.customer?.email || '').toLowerCase().trim();
        const userEmail = (user.email || '').toLowerCase().trim();
        const isOwner = (orderUserId && orderUserId === user.id) || (orderEmail && userEmail && orderEmail === userEmail);
        if (!isOwner && !isAdmin) {
          return res.status(403).json({ success: false, error: 'You are not authorized to request a return for this order.' });
        }
      }

      // 3. Status verification: Order MUST be DELIVERED
      const currentFulfillment = (
        (orderRow ? (orderRow.fulfillment_status || orderRow.fulfillmentStatus) : inMemoryOrder?.fulfillmentStatus) || 'PROCESSING'
      ).toUpperCase();

      if (currentFulfillment !== 'DELIVERED') {
        return res.status(400).json({
          success: false,
          error: `Return requests are only permitted for delivered orders. Current order status is '${currentFulfillment}'.`,
        });
      }

      // 4. Strict 7-Day Window Enforcement from actual delivery timestamp
      const deliveryInfo = resolveOrderDeliveryTimestamp(orderRow || inMemoryOrder);
      const deliveryTimestamp = deliveryInfo.timestamp;
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const deadlineTimestamp = deliveryTimestamp + SEVEN_DAYS_MS;

      if (now > deadlineTimestamp) {
        const expiredDateFormatted = new Date(deadlineTimestamp).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return res.status(400).json({
          success: false,
          error: `The 7-day return period for this order expired on ${expiredDateFormatted}. Return requests cannot be accepted.`,
        });
      }

      // 5. Match order item
      const orderItems = orderRow?.order_items || inMemoryOrder?.items || [];
      let matchedItem: any = null;

      if (orderItemId) {
        matchedItem = orderItems.find((it: any) => it.id === orderItemId || (it as any).orderItemId === orderItemId);
      }
      if (!matchedItem && productId) {
        matchedItem = orderItems.find((it: any) => it.product_id === productId || it.productId === productId);
      }
      if (!matchedItem && orderItems.length > 0) {
        matchedItem = orderItems[0];
      }

      const resolvedProductName = matchedItem?.product_name || matchedItem?.productName || 'STUNNING BIRDS Handcrafted Leather Piece';
      const resolvedProductImage = matchedItem?.product_image || matchedItem?.productImage || 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80';
      const resolvedSku = matchedItem?.sku || matchedItem?.product_sku || 'SB-RET-01';
      const resolvedQty = Number(matchedItem?.quantity) || 1;
      const resolvedPrice = Number(matchedItem?.price) || Number(orderRow?.total || inMemoryOrder?.total || 0);
      const resolvedPaidAmount = resolvedPrice * resolvedQty;

      const customerName = orderRow?.customer_name || inMemoryOrder?.customer?.name || user.user_metadata?.full_name || user.email.split('@')[0];
      const customerEmail = orderRow?.customer_email || inMemoryOrder?.customer?.email || user.email;
      const customerPhone = orderRow?.shipping_address?.phone || inMemoryOrder?.shippingAddress?.phone || undefined;

      // 6. Check for duplicate active return requests on this order item
      const canonicalOrderId = orderRow?.id || inMemoryOrder?.id || orderId;
      const resolvedOrderItemId = matchedItem?.id || undefined;
      const resolvedProductId = matchedItem?.product_id || matchedItem?.productId || undefined;

      let duplicateExists = false;
      try {
        let dupQuery = client
          .from('return_requests')
          .select('id, return_request_id, status')
          .eq('order_id', canonicalOrderId)
          .neq('status', 'RETURN_REJECTED');

        if (resolvedOrderItemId) {
          dupQuery = dupQuery.eq('order_item_id', resolvedOrderItemId);
        } else if (resolvedProductId) {
          dupQuery = dupQuery.eq('product_id', resolvedProductId);
        }

        const { data: dupRows } = await dupQuery;
        if (dupRows && dupRows.length > 0) {
          duplicateExists = true;
        }
      } catch (dErr) {
        // Fallback to in-memory check
        const inMemDup = returnRequests.find(r => 
          r.orderId === canonicalOrderId && 
          r.status !== 'RETURN_REJECTED' && 
          (r.orderItemId === resolvedOrderItemId || r.productId === resolvedProductId)
        );
        if (inMemDup) duplicateExists = true;
      }

      if (duplicateExists) {
        return res.status(409).json({
          success: false,
          error: 'An active return request already exists for this item. Please check your existing return status under My Returns.',
        });
      }

      // 7. Generate unique Return Request ID
      const returnRequestId = `RET-SB-${Math.floor(1000 + Math.random() * 9000)}`;
      const requestedAt = new Date().toISOString();
      const returnDeadlineStr = new Date(deadlineTimestamp).toISOString();

      const newReturnRecord = {
        return_request_id: returnRequestId,
        order_id: canonicalOrderId,
        order_item_id: resolvedOrderItemId || null,
        customer_id: user.id || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        product_id: resolvedProductId || null,
        product_name: resolvedProductName,
        product_image: resolvedProductImage,
        product_sku: resolvedSku,
        quantity: resolvedQty,
        item_price: resolvedPrice,
        paid_amount: resolvedPaidAmount,
        reason: reason as ReturnReason,
        description: sanitizeString(description),
        evidence_email_confirmed: true,
        status: 'RETURN_REQUESTED' as ReturnStatus,
        delivery_at_submission: deliveryInfo.formatted,
        return_deadline: returnDeadlineStr,
        requested_at: requestedAt,
        inspection_result: 'PENDING' as const,
        refund_amount: resolvedPaidAmount,
        refund_status: 'PENDING' as const,
      };

      let insertedReturn: ReturnRequest | null = null;

      // 8. Insert into Supabase
      try {
        const { data: insData, error: insErr } = await client
          .from('return_requests')
          .insert(newReturnRecord)
          .select('*')
          .single();

        if (insErr) {
          console.warn('Supabase return request insert error (falling back to memory):', insErr);
        } else if (insData) {
          // Record initial audit history using service role client or trigger
          const initialHistory = await recordReturnStatusHistory({
            client,
            serviceClient: getServiceSupabase(),
            returnRequestId,
            oldStatus: null,
            newStatus: 'RETURN_REQUESTED',
            changedBy: user.email,
            changedByRole: 'CUSTOMER',
            note: `Return request submitted with reason: ${reason}. Patron confirmed unboxing video email submission to stunningbirds236@gmail.com.`,
            createdAt: requestedAt,
          });

          // Fetch refreshed return with history
          const queryClient = getServiceSupabase() || client;
          const { data: refreshedData } = await queryClient
            .from('return_requests')
            .select('*, return_status_history(*)')
            .eq('return_request_id', returnRequestId)
            .maybeSingle();

          if (refreshedData) {
            insertedReturn = mapSupabaseReturnRequest(refreshedData);
          } else {
            insertedReturn = mapSupabaseReturnRequest(insData);
          }

          if (!insertedReturn.history || insertedReturn.history.length === 0) {
            insertedReturn.history = [initialHistory];
          }
        }
      } catch (dbErr) {
        console.warn('Database error during return insertion:', dbErr);
      }

      // Fallback/In-memory synchronization
      if (!insertedReturn) {
        insertedReturn = {
          id: `ret-uuid-${Date.now()}`,
          returnRequestId,
          orderId: canonicalOrderId,
          orderItemId: resolvedOrderItemId,
          customerId: user.id,
          customerName,
          customerEmail,
          customerPhone,
          productId: resolvedProductId,
          productName: resolvedProductName,
          productImage: resolvedProductImage,
          productSku: resolvedSku,
          quantity: resolvedQty,
          itemPrice: resolvedPrice,
          paidAmount: resolvedPaidAmount,
          reason: reason as ReturnReason,
          description: sanitizeString(description),
          evidenceEmailConfirmed: true,
          status: 'RETURN_REQUESTED',
          deliveryAtSubmission: deliveryInfo.formatted,
          returnDeadline: returnDeadlineStr,
          requestedAt,
          inspectionResult: 'PENDING',
          refundAmount: resolvedPaidAmount,
          refundStatus: 'PENDING',
          createdAt: requestedAt,
          history: [
            {
              id: `hist-${Date.now()}`,
              returnRequestId,
              newStatus: 'RETURN_REQUESTED',
              changedBy: user.email,
              changedByRole: 'CUSTOMER',
              note: `Return request submitted with reason: ${reason}. Patron confirmed unboxing video email submission to stunningbirds236@gmail.com.`,
              createdAt: requestedAt,
            },
          ],
        };
      }

      // Synchronize in-memory stores safely without duplicates
      const existingIdx = returnRequests.findIndex(r => r.returnRequestId === returnRequestId);
      if (existingIdx === -1) {
        returnRequests.unshift(insertedReturn);
      } else {
        returnRequests[existingIdx] = insertedReturn;
      }

      if (insertedReturn.history && insertedReturn.history.length > 0) {
        insertedReturn.history.forEach(h => {
          if (!returnStatusHistory.some(existingH => existingH.id === h.id || (existingH.returnRequestId === h.returnRequestId && existingH.newStatus === h.newStatus && existingH.createdAt === h.createdAt))) {
            returnStatusHistory.unshift(h);
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: `Return request ${returnRequestId} created successfully. Please send your complete unboxing video to stunningbirds236@gmail.com.`,
        returnRequest: insertedReturn,
      });
    } catch (err: any) {
      console.error('Unexpected error creating return request:', err);
      return res.status(500).json({
        success: false,
        error: 'An unexpected server error occurred while processing your return request.',
      });
    }
  });

  // 19.2 GET /api/returns: List return requests (Customer sees own, Admin sees all)
  app.get('/api/returns', requireAuth, async (req, res) => {
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;
    const authToken = (req as any).authToken;
    const { status, reason, search } = req.query;

    const client = getScopedSupabase(authToken);

    try {
      let query = client
        .from('return_requests')
        .select('*, return_status_history(*)')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.or(`customer_id.eq.${user.id},customer_email.ilike.${user.email}`);
      }

      if (status && status !== 'All') {
        query = query.eq('status', String(status));
      }

      if (reason && reason !== 'All') {
        query = query.eq('reason', String(reason));
      }

      const { data: dbReturns, error } = await query;

      let results: ReturnRequest[] = [];
      if (!error && dbReturns && dbReturns.length > 0) {
        results = dbReturns.map(mapSupabaseReturnRequest);
      } else {
        // Fallback to in-memory store
        results = [...returnRequests];
        if (!isAdmin) {
          results = results.filter(r => 
            (r.customerId && r.customerId === user.id) || 
            (r.customerEmail && r.customerEmail.toLowerCase() === user.email.toLowerCase())
          );
        }
        if (status && status !== 'All') {
          results = results.filter(r => r.status === status);
        }
        if (reason && reason !== 'All') {
          results = results.filter(r => r.reason === reason);
        }
      }

      if (search) {
        const q = String(search).toLowerCase();
        results = results.filter(r =>
          r.returnRequestId.toLowerCase().includes(q) ||
          r.orderId.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerEmail.toLowerCase().includes(q) ||
          (r.trackingNumber && r.trackingNumber.toLowerCase().includes(q))
        );
      }

      return res.json({
        success: true,
        count: results.length,
        returns: results,
      });
    } catch (err: any) {
      console.error('Error fetching return requests:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch return requests.' });
    }
  });

  // 19.3 GET /api/returns/:id: Fetch single return request with audit history
  app.get('/api/returns/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;
    const authToken = (req as any).authToken;

    const client = getScopedSupabase(authToken);

    try {
      let query = client
        .from('return_requests')
        .select('*, return_status_history(*)');
      query = applyReturnFilter(query, id);
      const { data: dbReturn, error } = await query.maybeSingle();

      let result: ReturnRequest | null = null;
      if (!error && dbReturn) {
        result = mapSupabaseReturnRequest(dbReturn);
      } else {
        result = returnRequests.find(r => r.id === id || r.returnRequestId === id) || null;
      }

      if (!result) {
        return res.status(404).json({ success: false, error: 'Return request not found.' });
      }

      // Check access permission
      const isOwner = (result.customerId && result.customerId === user.id) || 
                      (result.customerEmail && result.customerEmail.toLowerCase() === user.email.toLowerCase());
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }

      return res.json({ success: true, returnRequest: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to fetch return details.' });
    }
  });

  // 19.4 POST /api/admin/returns/:id/approve: Approve return request
  app.post('/api/admin/returns/:id/approve', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const dbClient = getServiceSupabase();

    if (!dbClient) {
      console.error(`[Admin Return Approve] Service role configuration is missing at runtime.`);
      return res.status(500).json({
        success: false,
        error: 'Server Supabase service-role configuration is missing.',
      });
    }

    try {
      const cleanId = decodeURIComponent(String(id || '')).trim();
      console.log(`[Admin Return Approve] Processing approval for return ID/Code: '${cleanId}' by admin: '${user?.email}'`);

      // 1. Direct query to Supabase public.return_requests
      let checkQuery = dbClient.from('return_requests').select('*');
      if (UUID_REGEX.test(cleanId)) {
        checkQuery = checkQuery.eq('id', cleanId);
      } else {
        checkQuery = checkQuery.eq('return_request_id', cleanId);
      }

      const { data: dbCurrent, error: checkError } = await checkQuery.maybeSingle();

      if (checkError) {
        console.error('[Admin Return Approve] Lookup error on return_requests:', checkError);
        return res.status(500).json({
          success: false,
          error: checkError.message || 'Database error querying return request.',
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint,
        });
      }

      if (!dbCurrent) {
        console.warn(`[Admin Return Approve] Return request '${cleanId}' not found in database.`);
        return res.status(404).json({
          success: false,
          error: `Return request '${cleanId}' not found in database.`,
        });
      }

      const existingReturn = mapSupabaseReturnRequest(dbCurrent);

      // Idempotency: if already approved, return success immediately
      if (existingReturn.status === 'RETURN_APPROVED') {
        return res.json({
          success: true,
          message: `Return ${existingReturn.returnRequestId} is already approved. Reverse pickup may be scheduled.`,
          returnRequest: existingReturn,
        });
      }

      const now = new Date().toISOString();
      const oldStatus = existingReturn.status || 'RETURN_REQUESTED';
      const updateData = {
        status: 'RETURN_APPROVED',
        approved_at: now,
        approved_by: user.email,
        updated_at: now,
      };

      // 2. Update that exact row in Supabase using its UUID primary key
      const { data: updated, error: updateError } = await dbClient
        .from('return_requests')
        .update(updateData)
        .eq('id', dbCurrent.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        console.error('[Admin Return Approve] Update error on return_requests:', updateError);
        return res.status(500).json({
          success: false,
          error: updateError?.message || 'Failed to update return status in database.',
          code: updateError?.code,
          details: updateError?.details,
          hint: updateError?.hint,
        });
      }

      const updatedReturn = mapSupabaseReturnRequest(updated);

      // 3. Record exactly one status transition in return_status_history using service client
      try {
        await recordReturnStatusHistory({
          serviceClient: dbClient,
          returnRequestId: updatedReturn.returnRequestId,
          oldStatus,
          newStatus: 'RETURN_APPROVED',
          changedBy: user.email,
          changedByRole: 'ADMIN',
          note: 'Return request approved by Atelier Management after unboxing video verification.',
          createdAt: now,
        });
      } catch (historyErr: any) {
        console.error('[Admin Return Approve] Error inserting return_status_history:', historyErr);
        return res.status(500).json({
          success: false,
          error: historyErr?.message || 'Failed to record return status history in database.',
        });
      }

      // 4. Refetch complete record with history using service client
      const { data: refreshed, error: refetchErr } = await dbClient
        .from('return_requests')
        .select('*, return_status_history(*)')
        .eq('return_request_id', updatedReturn.returnRequestId)
        .maybeSingle();

      if (refetchErr) {
        console.error('[Admin Return Approve] Refetch error on return_requests:', refetchErr);
        return res.status(500).json({
          success: false,
          error: refetchErr.message || 'Failed to refetch approved return request.',
          code: refetchErr.code,
          details: refetchErr.details,
          hint: refetchErr.hint,
        });
      }

      const finalReturn = refreshed ? mapSupabaseReturnRequest(refreshed) : updatedReturn;

      return res.json({
        success: true,
        message: `Return ${finalReturn.returnRequestId} has been approved. Reverse pickup may now be scheduled.`,
        returnRequest: finalReturn,
      });
    } catch (err: any) {
      console.error('[Admin Return Approve] Unhandled exception in approve return:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Internal server error while approving return request.',
      });
    }
  });

  // 19.5 POST /api/admin/returns/:id/reject: Reject return request with mandatory reason
  app.post('/api/admin/returns/:id/reject', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const authToken = (req as any).authToken;

    const validation = AdminReturnRejectSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || 'A clear rejection reason of at least 5 characters is required.',
      });
    }

    const { rejectionReason } = validation.data;
    const client = getScopedSupabase(authToken);
    const dbClient = getServiceSupabase() || client;

    try {
      // 1. Fetch current return
      let checkQuery = dbClient.from('return_requests').select('*');
      checkQuery = applyReturnFilter(checkQuery, id);
      const { data: dbCurrent, error: checkError } = await checkQuery.maybeSingle();

      if (checkError) {
        console.error('Failed to query return request for rejection:', {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint,
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to find return request in database.',
          details: checkError.message,
          code: checkError.code,
          hint: checkError.hint,
        });
      }

      const existingReturn = dbCurrent ? mapSupabaseReturnRequest(dbCurrent) : returnRequests.find(r => r.id === id || r.returnRequestId === id);

      if (!existingReturn) {
        return res.status(404).json({ success: false, error: 'Return request not found.' });
      }

      if (existingReturn.status === 'RETURN_REJECTED' && existingReturn.rejectionReason === rejectionReason) {
        return res.json({
          success: true,
          message: `Return ${existingReturn.returnRequestId} is already rejected.`,
          returnRequest: existingReturn,
        });
      }

      const now = new Date().toISOString();
      const oldStatus = existingReturn.status || 'RETURN_REQUESTED';
      const updateData = {
        status: 'RETURN_REJECTED',
        rejected_at: now,
        rejected_by: user.email,
        rejection_reason: rejectionReason,
        refund_status: 'NOT_APPLICABLE',
        updated_at: now,
      };

      let updQuery = dbClient.from('return_requests').update(updateData);
      updQuery = applyReturnFilter(updQuery, id);
      const { data: updated, error: updateError } = await updQuery
        .select('*')
        .single();

      if (updateError || !updated) {
        console.error('Failed to update return rejection in Supabase:', {
          message: updateError?.message,
          code: updateError?.code,
          details: updateError?.details,
          hint: updateError?.hint,
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to update return rejection in database.',
          details: updateError?.message || 'Database update failed',
          code: updateError?.code,
          hint: updateError?.hint,
        });
      }

      const updatedReturn = mapSupabaseReturnRequest(updated);
      try {
        await recordReturnStatusHistory({
          client,
          serviceClient: getServiceSupabase(),
          returnRequestId: updatedReturn.returnRequestId,
          oldStatus,
          newStatus: 'RETURN_REJECTED',
          changedBy: user.email,
          changedByRole: 'ADMIN',
          note: `Return request rejected by Atelier Management. Reason: ${rejectionReason}`,
          createdAt: now,
        });
      } catch (historyErr: any) {
        console.error('Failed to insert return_status_history row for rejection:', historyErr);
        return res.status(500).json({
          success: false,
          error: 'Return status was updated in return_requests, but recording audit history failed.',
          details: historyErr?.message || 'History insert failed',
        });
      }

      let finalReturn = updatedReturn;
      try {
        const queryClient = getServiceSupabase() || client;
        const { data: refreshed, error: refetchErr } = await queryClient
          .from('return_requests')
          .select('*, return_status_history(*)')
          .eq('return_request_id', updatedReturn.returnRequestId)
          .maybeSingle();

        if (refetchErr) {
          console.warn('Notice: Refetching rejected return request with history encountered an issue:', {
            message: refetchErr.message,
            code: refetchErr.code,
            details: refetchErr.details,
            hint: refetchErr.hint,
          });
        } else if (refreshed) {
          finalReturn = mapSupabaseReturnRequest(refreshed);
        }
      } catch (refetchCatchErr) {
        console.warn('Refetch exception caught (safely proceeding with updated return data):', refetchCatchErr);
      }

      return res.json({
        success: true,
        message: `Return ${finalReturn.returnRequestId} has been rejected.`,
        returnRequest: finalReturn,
      });
    } catch (err: any) {
      console.error('Error rejecting return request:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to reject return request.' });
    }
  });

  // Handler for Reverse pickup & transit status update
  const handleCourierStatusUpdate = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const user = (req as any).user;
    const authToken = (req as any).authToken;

    const validation = AdminReturnCourierStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid courier status data.',
      });
    }

    const { status = 'PICKUP_SCHEDULED', courierName, trackingNumber, pickupNotes, adminNotes } = validation.data;
    const client = getScopedSupabase(authToken);

    try {
      // 1. Fetch current return
      let checkQuery = client.from('return_requests').select('*');
      checkQuery = applyReturnFilter(checkQuery, id);
      const { data: dbCurrent } = await checkQuery.maybeSingle();

      const existingReturn = dbCurrent ? mapSupabaseReturnRequest(dbCurrent) : returnRequests.find(r => r.id === id || r.returnRequestId === id);

      if (!existingReturn) {
        return res.status(404).json({ success: false, error: 'Return request not found.' });
      }

      const now = new Date().toISOString();
      const oldStatus = existingReturn.status || 'RETURN_APPROVED';
      const updateData: any = {
        status,
        updated_at: now,
      };

      if (courierName) updateData.courier_name = courierName;
      if (trackingNumber) updateData.tracking_number = trackingNumber;
      if (pickupNotes) updateData.pickup_notes = pickupNotes;
      if (adminNotes) updateData.admin_notes = adminNotes;

      if (status === 'PICKUP_SCHEDULED') updateData.pickup_scheduled_at = now;
      if (status === 'PICKED_UP') updateData.picked_up_at = now;
      if (status === 'IN_TRANSIT') updateData.in_transit_at = now;
      if (status === 'RETURN_RECEIVED') updateData.received_at = now;

      let updQuery = client.from('return_requests').update(updateData);
      updQuery = applyReturnFilter(updQuery, id);
      const { data: updated, error } = await updQuery
        .select('*')
        .single();

      if (error || !updated) {
        console.error('Failed to update courier status in Supabase:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update courier status in database.',
          details: error?.message,
        });
      }

      const updatedReturn = mapSupabaseReturnRequest(updated);
      await recordReturnStatusHistory({
        client,
        serviceClient: getServiceSupabase(),
        returnRequestId: updatedReturn.returnRequestId,
        oldStatus,
        newStatus: status,
        changedBy: user.email,
        changedByRole: 'ADMIN',
        note: `Reverse logistics updated to ${status}.${courierName ? ` Courier: ${courierName}.` : ''}${trackingNumber ? ` AWB: ${trackingNumber}.` : ''}${pickupNotes ? ` Note: ${pickupNotes}` : ''}`,
        createdAt: now,
      });

      const queryClient = getServiceSupabase() || client;
      const { data: refreshed } = await queryClient
        .from('return_requests')
        .select('*, return_status_history(*)')
        .eq('return_request_id', updatedReturn.returnRequestId)
        .maybeSingle();

      const finalReturn = refreshed ? mapSupabaseReturnRequest(refreshed) : updatedReturn;

      return res.json({
        success: true,
        message: `Reverse logistics status updated to ${status}.`,
        returnRequest: finalReturn,
      });
    } catch (err: any) {
      console.error('Error updating courier status:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update courier status.' });
    }
  };

  // 19.6 POST /api/admin/returns/:id/courier-status and /api/admin/returns/:id/courier
  app.post('/api/admin/returns/:id/courier-status', sensitiveActionLimiter, requireAdmin, handleCourierStatusUpdate);
  app.post('/api/admin/returns/:id/courier', sensitiveActionLimiter, requireAdmin, handleCourierStatusUpdate);

  // 19.7 POST /api/admin/returns/:id/inspection: Kolkata Physical Inspection recording
  app.post('/api/admin/returns/:id/inspection', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const authToken = (req as any).authToken;

    const validation = AdminReturnInspectionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || 'Inspection result and detailed notes (min 5 characters) are required.',
      });
    }

    const { inspectionResult, inspectionNotes } = validation.data;
    const client = getScopedSupabase(authToken);

    try {
      // 1. Fetch current return
      let checkQuery = client.from('return_requests').select('*');
      checkQuery = applyReturnFilter(checkQuery, id);
      const { data: dbCurrent } = await checkQuery.maybeSingle();

      const existingReturn = dbCurrent ? mapSupabaseReturnRequest(dbCurrent) : returnRequests.find(r => r.id === id || r.returnRequestId === id);

      if (!existingReturn) {
        return res.status(404).json({ success: false, error: 'Return request not found.' });
      }

      const now = new Date().toISOString();
      const oldStatus = existingReturn.status || 'RETURN_RECEIVED';
      const newStatus = inspectionResult === 'PASSED' ? 'INSPECTION_COMPLETED' : 'RETURN_RECEIVED';

      const updateData = {
        inspection_result: inspectionResult,
        inspection_notes: inspectionNotes,
        inspection_at: now,
        inspected_by: user.email,
        status: newStatus,
        updated_at: now,
      };

      let updQuery = client.from('return_requests').update(updateData);
      updQuery = applyReturnFilter(updQuery, id);
      const { data: updated, error } = await updQuery
        .select('*')
        .single();

      if (error || !updated) {
        console.error('Failed to record inspection in Supabase:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to record inspection in database.',
          details: error?.message,
        });
      }

      const updatedReturn = mapSupabaseReturnRequest(updated);
      await recordReturnStatusHistory({
        client,
        serviceClient: getServiceSupabase(),
        returnRequestId: updatedReturn.returnRequestId,
        oldStatus,
        newStatus,
        changedBy: user.email,
        changedByRole: 'ADMIN',
        note: `Physical inspection at Kolkata Atelier completed. Result: ${inspectionResult}. Notes: ${inspectionNotes}`,
        createdAt: now,
      });

      const queryClient = getServiceSupabase() || client;
      const { data: refreshed } = await queryClient
        .from('return_requests')
        .select('*, return_status_history(*)')
        .eq('return_request_id', updatedReturn.returnRequestId)
        .maybeSingle();

      const finalReturn = refreshed ? mapSupabaseReturnRequest(refreshed) : updatedReturn;

      return res.json({
        success: true,
        message: `Physical inspection recorded as ${inspectionResult}. ${inspectionResult === 'PASSED' ? 'Eligible for refund processing.' : 'Refund is withheld pending review.'}`,
        returnRequest: finalReturn,
      });
    } catch (err: any) {
      console.error('Error recording inspection:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to record inspection result.' });
    }
  });

  // 19.8 POST /api/admin/returns/:id/refund: Manual Refund Workflow
  app.post('/api/admin/returns/:id/refund', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const authToken = (req as any).authToken;

    const validation = AdminReturnRefundSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid refund request parameters.',
      });
    }

    const {
      refundAmount: overrideAmount,
      refundReference: inputReference,
      refundedAt: inputRefundedAt,
      manualRefundNote,
      notes,
      status: requestedStatus,
      markCompleted,
    } = validation.data;
    const client = getScopedSupabase(authToken);

    try {
      // 1. Fetch return request
      let checkQuery = client.from('return_requests').select('*');
      checkQuery = applyReturnFilter(checkQuery, id);
      const { data: dbReturn } = await checkQuery.maybeSingle();

      const returnReq: ReturnRequest | null = dbReturn ? mapSupabaseReturnRequest(dbReturn) : returnRequests.find(r => r.id === id || r.returnRequestId === id) || null;

      if (!returnReq) {
        return res.status(404).json({ success: false, error: 'Return request not found.' });
      }

      if (returnReq.status !== 'INSPECTION_COMPLETED' && returnReq.inspectionResult !== 'PASSED' && returnReq.status !== 'REFUNDED' && returnReq.status !== 'RETURN_COMPLETED') {
        return res.status(400).json({
          success: false,
          error: `Refund can only be processed after Kolkata inspection is PASSED. Current inspection status is '${returnReq.inspectionResult || 'PENDING'}'.`,
        });
      }

      if (returnReq.refundStatus === 'COMPLETED' && returnReq.status === 'REFUNDED' && !markCompleted && !requestedStatus) {
        return res.json({
          success: true,
          message: `A refund has already been recorded for this return request (Reference: ${returnReq.refundReference || 'COMPLETED'}).`,
          returnRequest: returnReq,
          refundReference: returnReq.refundReference,
          refundAmount: returnReq.refundAmount,
        });
      }

      // Calculate final refund amount derived server-side
      const maxEligibleAmount = Number(returnReq.paidAmount) || Number(returnReq.refundAmount) || 0;
      const finalRefundAmount = overrideAmount !== undefined && overrideAmount > 0 && overrideAmount <= maxEligibleAmount
        ? overrideAmount
        : maxEligibleAmount;

      if (finalRefundAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Refund amount must be greater than zero.' });
      }

      const now = new Date().toISOString();
      const refundTimestamp = inputRefundedAt || now;
      const refundRef = inputReference?.trim() || manualRefundNote?.trim() || returnReq.refundReference || `REF-SB-${Date.now().toString(36).toUpperCase()}`;
      const targetStatus: ReturnStatus = markCompleted ? 'RETURN_COMPLETED' : ((requestedStatus as ReturnStatus) || 'REFUNDED');
      const oldStatus = returnReq.status || 'INSPECTION_COMPLETED';
      const refundNoteText = notes || manualRefundNote || '';

      const updateData: any = {
        refund_amount: finalRefundAmount,
        refund_status: 'COMPLETED',
        refund_reference: refundRef,
        refund_failure_reason: null,
        refunded_at: refundTimestamp,
        status: targetStatus,
        updated_at: now,
      };

      if (targetStatus === 'RETURN_COMPLETED') {
        updateData.completed_at = now;
      }
      if (refundNoteText) {
        updateData.admin_notes = refundNoteText;
      }

      let updQuery = client.from('return_requests').update(updateData);
      updQuery = applyReturnFilter(updQuery, id);
      const { data: updatedDbReturn, error: updateErr } = await updQuery
        .select('*')
        .single();

      if (updateErr || !updatedDbReturn) {
        console.error('Error updating refund in Supabase:', updateErr);
        return res.status(500).json({
          success: false,
          error: 'Failed to record refund in database.',
          details: updateErr?.message,
        });
      }

      const finalUpdatedReturn = mapSupabaseReturnRequest(updatedDbReturn);
      await recordReturnStatusHistory({
        client,
        serviceClient: getServiceSupabase(),
        returnRequestId: finalUpdatedReturn.returnRequestId,
        oldStatus,
        newStatus: targetStatus,
        changedBy: user.email,
        changedByRole: 'ADMIN',
        note: `Manual refund of ₹${finalRefundAmount.toLocaleString('en-IN')} recorded. Reference: ${refundRef}.${refundNoteText ? ` Notes: ${refundNoteText}` : ''}`,
        createdAt: now,
      });

      const queryClient = getServiceSupabase() || client;
      const { data: refreshed } = await queryClient
        .from('return_requests')
        .select('*, return_status_history(*)')
        .eq('return_request_id', finalUpdatedReturn.returnRequestId)
        .maybeSingle();

      const resolvedReturn = refreshed ? mapSupabaseReturnRequest(refreshed) : finalUpdatedReturn;

      return res.json({
        success: true,
        message: `Refund of ₹${finalRefundAmount.toLocaleString('en-IN')} successfully completed. Status: ${targetStatus}. Reference: ${refundRef}`,
        returnRequest: resolvedReturn,
        refundReference: refundRef,
        refundAmount: finalRefundAmount,
      });
    } catch (err: any) {
      console.error('Error processing refund:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to process refund.' });
    }
  });

  // 19.9 POST /api/admin/returns/:id/status: Generic manual status transition endpoint
  app.post('/api/admin/returns/:id/status', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;
    const authToken = (req as any).authToken;

    const validation = AdminReturnStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid return status.',
      });
    }

    const { status, note } = validation.data;
    const client = getScopedSupabase(authToken);
    const dbClient = getServiceSupabase() || client;

    try {
      let checkQuery = dbClient.from('return_requests').select('*');
      checkQuery = applyReturnFilter(checkQuery, id);
      const { data: dbCurrent } = await checkQuery.maybeSingle();

      const existingReturn = dbCurrent ? mapSupabaseReturnRequest(dbCurrent) : returnRequests.find(r => r.id === id || r.returnRequestId === id);

      if (!existingReturn) {
        return res.status(404).json({ success: false, error: 'Return request not found.' });
      }

      const now = new Date().toISOString();
      const oldStatus = existingReturn.status;
      const updateData: any = {
        status,
        updated_at: now,
      };

      if (status === 'RETURN_APPROVED' && !existingReturn.approvedAt) {
        updateData.approved_at = now;
        updateData.approved_by = user.email;
      } else if (status === 'RETURN_REJECTED' && !existingReturn.rejectedAt) {
        updateData.rejected_at = now;
        updateData.rejected_by = user.email;
      } else if (status === 'RETURN_COMPLETED' && !existingReturn.completedAt) {
        updateData.completed_at = now;
      }

      let updQuery = dbClient.from('return_requests').update(updateData);
      updQuery = applyReturnFilter(updQuery, id);
      const { data: updated, error } = await updQuery
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Failed to update return status in Supabase:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update return status in database.',
          details: error?.message,
        });
      }

      let updatedReturn: ReturnRequest;
      if (updated) {
        updatedReturn = mapSupabaseReturnRequest(updated);
      } else {
        updatedReturn = {
          ...existingReturn,
          ...updateData,
          status,
          updatedAt: now,
        };
      }

      await recordReturnStatusHistory({
        client,
        serviceClient: dbClient,
        returnRequestId: updatedReturn.returnRequestId,
        oldStatus,
        newStatus: status,
        changedBy: user.email,
        changedByRole: 'ADMIN',
        note: note || `Status manually changed to ${status} by Atelier Management.`,
        createdAt: now,
      });

      const { data: refreshed } = await dbClient
        .from('return_requests')
        .select('*, return_status_history(*)')
        .eq('return_request_id', updatedReturn.returnRequestId)
        .maybeSingle();

      const finalReturn = refreshed ? mapSupabaseReturnRequest(refreshed) : updatedReturn;

      // Keep in-memory cache synchronized
      const memIdx = returnRequests.findIndex(r => r.id === finalReturn.id || r.returnRequestId === finalReturn.returnRequestId);
      if (memIdx !== -1) {
        returnRequests[memIdx] = finalReturn;
      } else {
        returnRequests.unshift(finalReturn);
      }

      return res.json({
        success: true,
        message: `Return status updated to ${status}.`,
        returnRequest: finalReturn,
      });
    } catch (err: any) {
      console.error('Error updating return status:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update return status.' });
    }
  });


  // 20. GET User Profile (AUTHENTICATED USERS ONLY)
  app.get('/api/user/profile', authLimiter, requireAuth, async (req, res) => {
    const user = (req as any).user;
    const isAdmin = (req as any).isAdmin;

    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const { data: latestCommission } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .or(`user_id.eq.${user.id},customer_email.ilike.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const userProfile: UserProfile = {
        id: user.id,
        name: profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email,
        avatarInitials: ((profile?.full_name || user.email) as string).substring(0, 2).toUpperCase(),
        avatarUrl: profile?.avatar_url,
        phone: profile?.phone,
        isAdmin,
        isLoggedIn: true,
        societyPoints: profile?.society_points !== undefined ? profile.society_points : 500,
        tier: profile?.tier || 'ARTISAN TIER',
        memberSince: profile?.member_since ? `Member since ${new Date(profile.member_since).getFullYear()}` : 'Member since 2025',
        wishlistProductIds: profile?.wishlist_product_ids || [],
        addresses: [],
      };

      res.json({
        user: userProfile,
        latestCommission: latestCommission ? mapSupabaseOrder(latestCommission) : null,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Error fetching user profile' });
    }
  });

  // 21. POST Wishlist Toggle (AUTHENTICATED USERS ONLY)
  app.post('/api/user/wishlist/toggle', requireAuth, async (req, res) => {
    const user = (req as any).user;
    const validation = WishlistToggleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid wishlist item parameters',
        details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { productId } = validation.data;

    try {
      const { data: existing } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', productId);
      } else {
        await supabase.from('wishlists').insert({ user_id: user.id, product_id: productId });
      }

      const { data: allWishlists } = await supabase.from('wishlists').select('product_id').eq('user_id', user.id);
      const wishlistIds = (allWishlists || []).map((w: any) => w.product_id);

      res.json({ wishlist: wishlistIds });
    } catch (e: any) {
      res.status(500).json({ error: 'Error toggling wishlist item' });
    }
  });

  // 22. GET Admin Metrics & Analytics (ADMIN ONLY)
  app.get('/api/admin/metrics', requireAdmin, async (req, res) => {
    try {
      const { data: dbOrders } = await supabase.from('orders').select('*');
      const validOrders = dbOrders || [];
      const paidOrders = validOrders.filter((o: any) => o.payment_status === 'Paid');
      const liveRevenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o?.total) || 0), 0);
      const totalOrders = paidOrders.length || validOrders.length;
      const avgOrderValue = totalOrders > 0 ? Math.round(liveRevenue / totalOrders) : 0;

      const metrics: AdminMetrics = {
        ...ADMIN_METRICS,
        totalRevenue: liveRevenue > 0 ? liveRevenue : ADMIN_METRICS.totalRevenue,
        totalOrders: totalOrders > 0 ? totalOrders : ADMIN_METRICS.totalOrders,
        avgOrderValue: avgOrderValue > 0 ? avgOrderValue : ADMIN_METRICS.avgOrderValue,
        activeCraftingCount: validOrders.filter((o: any) => o.fulfillment_status === 'CRAFTING').length || 1,
        dispatchedCount: validOrders.filter((o: any) => o.fulfillment_status === 'SHIPPED').length || 0,
        deliveredCount: validOrders.filter((o: any) => o.fulfillment_status === 'DELIVERED').length || 1,
      };

      res.json({
        metrics,
        recentOrders: validOrders.slice(0, 10).map(mapSupabaseOrder),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error calculating admin metrics' });
    }
  });

  // 23. POST Newsletter subscribe (Public)
  app.post('/api/newsletter', newsletterLimiter, (req, res) => {
    const validation = NewsletterSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.issues[0]?.message || 'Please enter a valid email address',
      });
    }

    const { email } = validation.data;
    if (!subscribers.includes(email)) {
      subscribers.push(email);
    }
    res.json({ success: true, message: 'Welcome to the Stunning Birds Journal.' });
  });

  // Catch-all 404 for unhandled API routes (Ensures JSON response instead of HTML SPA fallback)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.path}`,
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`STUNNING BIRDS secure server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
