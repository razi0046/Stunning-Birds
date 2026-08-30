import express from 'express';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, CURRENT_USER, ADMIN_METRICS } from './src/data/mockData';
import { Order, Product, UserProfile, AdminMetrics } from './src/types';
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
  NewsletterSchema,
  WishlistToggleSchema,
} from './src/utils/securityValidators';

// ================= SUPABASE SERVER CLIENT CONFIGURATION =================
const SUPABASE_PROJECT_ID = 'arbfxnozydyodjkkgdoa';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_FdWEKN3Pbyl-WtFCfNPFAg_NFIzZes3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper: map Supabase order record to frontend Order interface
const mapSupabaseOrder = (o: any): Order => ({
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
  fulfillmentStatus: o.fulfillment_status || 'CRAFTING',
  shippingAddress: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : (o.shipping_address || {
    phone: '',
    pincode: '',
    city: '',
    state: '',
    addressLine: '',
  }),
  shippingMethod: o.shipping_method || 'Complimentary Express Courier (3-5 Business Days)',
  timeline: Array.isArray(o.timeline) ? o.timeline : [
    { key: 'placed', title: 'ORDER PLACED', subtitle: 'Just now', completed: true, current: false },
    { key: 'confirmed', title: 'CONFIRMED', subtitle: 'Payment Verified', completed: true, current: false },
    { key: 'atelier', title: 'AT THE ATELIER', subtitle: 'Cutting & Stitching in Progress', completed: false, current: true },
    { key: 'dispatched', title: 'DISPATCHED', subtitle: 'Pending completion', completed: false, current: false },
  ],
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
});

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
    try {
      const { data: profile } = await supabase
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
    message: { error: 'Too many requests. Please slow down and try again after a few minutes.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Authentication / profile request limit reached. Please try again after 15 minutes.' },
  });

  const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 40, // Allows payment retries & status polls while preventing payment endpoint flood
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Payment request limit reached. Please wait a few moments before trying again.' },
  });

  const couponLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 25, // Throttles coupon code brute-force attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: { valid: false, message: 'Too many coupon attempts. Please try again in 10 minutes.' },
  });

  const sensitiveActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Administrative action limit exceeded. Please try again later.' },
  });

  const reviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many product reviews submitted. Please try again later.' },
  });

  const newsletterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
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

    try {
      let query = supabase.from('orders').select('*, order_items(*)');

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
        let fallbackQuery = supabase.from('orders').select('*');
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
          const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);
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

    const cleanId = id.replace(/^#/, '');
    const targetIds = Array.from(new Set([id, cleanId, `#${cleanId}`])).filter(Boolean);

    try {
      const { data: dbOrders, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .in('id', targetIds);

      if (error || !dbOrders || dbOrders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

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

      res.json({ order });
    } catch (err: any) {
      res.status(500).json({ error: 'Error retrieving order' });
    }
  });

  // 10. DELETE Order (ADMIN ONLY)
  app.delete('/api/orders/:id', sensitiveActionLimiter, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const cleanId = id.replace(/^#/, '');
    const targetIds = Array.from(new Set([id, cleanId, `#${cleanId}`])).filter(Boolean);

    try {
      await supabase.from('order_items').delete().in('order_id', targetIds);
      const { error, count } = await supabase.from('orders').delete({ count: 'exact' }).in('id', targetIds);

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

    const targetIds = Array.from(new Set([id, id.replace(/^#/, ''), `#${id.replace(/^#/, '')}`])).filter(Boolean);

    try {
      const { data: dbOrders } = await supabase.from('orders').select('*, order_items(*)').in('id', targetIds);
      if (!dbOrders || dbOrders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderRow = dbOrders[0];
      const order = mapSupabaseOrder(orderRow);

      if (!isAdmin) {
        const userEmail = (user.email || '').toLowerCase().trim();
        const orderEmail = (order.customer?.email || '').toLowerCase().trim();
        const orderUserId = (orderRow as any).user_id;
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

    const targetIds = Array.from(new Set([id, id.replace(/^#/, ''), `#${id.replace(/^#/, '')}`])).filter(Boolean);

    try {
      const { data: dbOrders } = await supabase.from('orders').select('*, order_items(*)').in('id', targetIds);
      if (!dbOrders || dbOrders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderRow = dbOrders[0];
      const order = mapSupabaseOrder(orderRow);

      if (!isAdmin) {
        const userEmail = (user.email || '').toLowerCase().trim();
        const orderEmail = (order.customer?.email || '').toLowerCase().trim();
        const orderUserId = (orderRow as any).user_id;
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
    const targetIds = Array.from(new Set([id, id.replace(/^#/, ''), `#${id.replace(/^#/, '')}`])).filter(Boolean);

    try {
      const { data: dbOrders } = await supabase.from('orders').select('*, order_items(*)').in('id', targetIds);
      if (!dbOrders || dbOrders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = mapSupabaseOrder(dbOrders[0]);
      const newLabel = generateShippingLabelData(order, undefined, products);
      order.shippingLabel = newLabel;

      await supabase.from('orders').update({ shipping_label: newLabel }).in('id', targetIds);

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

    try {
      const updatePayload: any = {};
      if (fulfillmentStatus) updatePayload.fulfillment_status = fulfillmentStatus;
      if (paymentStatus) updatePayload.payment_status = paymentStatus;

      const { data: updatedRows, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .in('id', targetIds)
        .select('*, order_items(*)');

      if (error || !updatedRows || updatedRows.length === 0) {
        return res.status(404).json({ error: 'Order not found or update failed' });
      }

      const updatedOrder = mapSupabaseOrder(updatedRows[0]);
      res.json({ order: updatedOrder });
    } catch (e: any) {
      res.status(500).json({ error: 'Error updating order status' });
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
