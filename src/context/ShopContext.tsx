import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Product, CartItem, Order, UserProfile, AdminMetrics, FoilColor, ShippingLabel, ProductReview, TimelineStep, FulfillmentStatus } from '../types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, CURRENT_USER, ADMIN_METRICS } from '../data/mockData';
import { generateShippingLabelData } from '../utils/shippingLabelGenerator';
import { exportOrdersToDelhiveryExcel } from '../utils/delhiveryExcelExport';
import { supabase } from '../supabaseClient';
import { uploadProductImagesList, 
  deleteProductImagesFromStorage, 
  deleteProductFolderFromStorage 
} from '../utils/supabaseStorage';
import { sendOrderConfirmationEmail } from '../services/emailService';

export type ScreenView = 
  | 'home'
  | 'shop'
  | 'product-detail'
  | 'checkout'
  | 'admin-login'
  | 'admin-overview'
  | 'admin-orders'
  | 'account'
  | 'login'
  | 'order-success'
  | 'terms-and-conditions'
  | 'privacy-policy'
  | 'shipping-policy'
  | 'cancellation-and-refund'
  | 'contact-us';

interface ShopContextType {
  currentScreen: ScreenView;
  setCurrentScreen: (screen: ScreenView) => void;
  products: Product[];
  selectedProduct: Product;
  setSelectedProduct: (product: Product) => void;
  openProductBySlug: (slugOrId: string) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, monogram?: string, foilColor?: FoilColor) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  orders: Order[];
  latestPlacedOrder: Order | null;
  placeOrder: (orderData: Partial<Order>) => Promise<Order>;
  createVerifiedOrder: (
    orderData: Partial<Order>,
    paymentDetails: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature?: string;
    }
  ) => Promise<Order>;
  createPendingOrder?: (orderData: Partial<Order>) => Promise<Order>;
  confirmOrderPayment?: (
    orderId: string,
    paymentDetails: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature?: string;
    }
  ) => Promise<Order | null>;
  markOrderPaymentFailed?: (orderId: string, reason?: string) => Promise<void>;
  updateOrderStatus: (orderId: string, fulfillmentStatus?: string, paymentStatus?: string) => Promise<void>;
  bulkUpdateOrderStatus: (
    orderIds: string[],
    fulfillmentStatus: FulfillmentStatus
  ) => Promise<{ success: boolean; updatedCount: number; failedCount: number; message: string; failedOrders?: Array<{ id: string; reason: string }> }>;
  updateOrderShippingLabel: (orderId: string, label: ShippingLabel) => void;
  regenerateShippingLabel: (orderId: string) => Promise<ShippingLabel>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  cancelCustomerOrder: (orderId: string, reason?: string, note?: string) => Promise<{ success: boolean; message?: string; order?: Order }>;
  markOrderAsRefunded: (orderId: string) => Promise<{ success: boolean; message?: string; order?: Order }>;
  addNewProduct: (productData: Partial<Product>) => Promise<void>;
  updateProduct: (productId: string, updatedFields: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<boolean>;
  exportOrdersCSV: (targetOrders?: Order[]) => void;
  exportDelhiveryExcel?: (targetOrders?: Order[]) => void;
  exportProductsCSV: () => void;
  refetchOrders: () => Promise<void>;
  userProfile: UserProfile;
  toggleWishlist: (productId: string) => void;
  addProductReview: (productId: string, reviewData: { rating: number; title: string; comment: string }) => Promise<boolean>;
  adminMetrics: AdminMetrics;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (cat: string) => void;
  selectedColorFilter: string;
  setSelectedColorFilter: (col: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  // Global Page Loading
  isPageLoading: boolean;
  pageLoadingLabel: string | null;
  triggerPageLoad: (durationMs?: number, label?: string) => void;
  setPageLoading: (loading: boolean, label?: string) => void;
  // Authentication
  isLoggedIn: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  authPromptMessage: string | null;
  openAuthModal: (mode?: 'login' | 'register', redirectAction?: () => void, promptMessage?: string) => void;
  closeAuthModal: () => void;
  login: (email: string, password?: string, customName?: string) => Promise<boolean>;
  register: (name: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  getProductVariants: (product: Product) => Product[];
}

interface StoredVariantLink {
  variantGroup?: string;
  linkedVariantIds: string[];
}

export const getStoredVariantLinksMap = (): Record<string, StoredVariantLink> => {
  try {
    const raw = localStorage.getItem('sb_product_variant_links');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveStoredVariantLinksMap = (map: Record<string, StoredVariantLink>) => {
  try {
    localStorage.setItem('sb_product_variant_links', JSON.stringify(map));
  } catch {}
};

export interface StoredProductSeo {
  seoTitle?: string;
  seoMetaDescription?: string;
}

export const getStoredSeoMetadataMap = (): Record<string, StoredProductSeo> => {
  try {
    const raw = localStorage.getItem('sb_product_seo_metadata');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveStoredSeoMetadataMap = (map: Record<string, StoredProductSeo>) => {
  try {
    localStorage.setItem('sb_product_seo_metadata', JSON.stringify(map));
  } catch {}
};

// Helper: map Supabase product record to frontend Product interface
const mapSupabaseProduct = (p: any): Product => {
  const sellingPrice = p.selling_price !== undefined && p.selling_price !== null 
    ? Number(p.selling_price) 
    : (p.price !== undefined && p.price !== null ? Number(p.price) : 0);
  const mrpPrice = p.mrp !== undefined && p.mrp !== null 
    ? Number(p.mrp) 
    : (p.original_price !== undefined && p.original_price !== null ? Number(p.original_price) : undefined);

  const storedLinksMap = getStoredVariantLinksMap();
  const storedLink = storedLinksMap[p.id] || storedLinksMap[p.slug];
  const initialMatch = INITIAL_PRODUCTS.find(ip => ip.id === p.id || ip.slug === p.slug);

  const storedSeoMap = getStoredSeoMetadataMap();
  const storedSeo = storedSeoMap[p.id] || storedSeoMap[p.slug];

  const variantGroup = p.variant_group || p.variantGroup || storedLink?.variantGroup || initialMatch?.variantGroup || undefined;
  const linkedVariantIds = Array.isArray(p.linked_variant_ids)
    ? p.linked_variant_ids
    : (Array.isArray(p.linkedVariantIds)
      ? p.linkedVariantIds
      : (storedLink?.linkedVariantIds || initialMatch?.linkedVariantIds || undefined));

  const seoTitle = p.seo_title || p.seoTitle || storedSeo?.seoTitle || initialMatch?.seoTitle || undefined;
  const seoMetaDescription = p.seo_description || p.seo_meta_description || p.seoMetaDescription || storedSeo?.seoMetaDescription || initialMatch?.seoMetaDescription || undefined;

  return {
    id: p.id,
    sku: p.sku || p.sku_id,
    skuId: p.sku || p.sku_id,
    slug: p.slug,
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
    material: p.material || 'Full-Grain Tuscan Leather',
    dimensions: p.dimensions || '',
    rating: Number(p.rating) || 5.0,
    reviewsCount: Number(p.reviews_count) || 0,
    badge: p.badge || undefined,
    inStock: p.in_stock !== false,
    stockQuantity: p.stock_quantity !== undefined ? Number(p.stock_quantity) : 50,
    images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85'],
    description: p.description || '',
    materialsDetails: p.materials_details || '',
    careInstructions: p.care_instructions || '',
    shippingInfo: p.shipping_info || '',
    monogramAvailable: p.monogram_available !== false,
    featured: Boolean(p.featured),
    isNewArrival: Boolean(p.is_new_arrival),
    productHighlights: Array.isArray(p.product_highlights) ? p.product_highlights : [],
    variantGroup,
    linkedVariantIds,
    seoTitle,
    seo_title: seoTitle,
    seoMetaDescription,
    seo_meta_description: seoMetaDescription,
    reviews: Array.isArray(p.product_reviews) ? p.product_reviews.map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      authorName: r.author_name,
      authorEmail: r.author_email,
      authorAvatar: r.author_avatar,
      rating: Number(r.rating),
      title: r.title,
      comment: r.comment,
      date: r.date,
      verifiedPurchase: r.verified_purchase !== false,
    })) : [],
  };
};

export const generateTimelineFromStatus = (status: string = 'PROCESSING', orderDate?: string, awb?: string): TimelineStep[] => {
  const normStatus = (status || 'PROCESSING').toUpperCase();
  
  if (normStatus === 'CANCELLED') {
    return [
      {
        key: 'placed',
        title: 'ORDER PLACED',
        subtitle: orderDate || 'Order Received',
        completed: true,
        current: false,
      },
      {
        key: 'cancelled',
        title: 'ORDER CANCELLED',
        subtitle: 'Cancelled at Patron Request',
        completed: true,
        current: true,
      },
    ];
  }

  let step = 0; // 0: Processing, 1: Crafting, 2: Shipped, 3: Delivered
  if (normStatus === 'PROCESSING') {
    step = 0;
  } else if (normStatus === 'CRAFTING') {
    step = 1;
  } else if (normStatus === 'SHIPPED') {
    step = 2;
  } else if (normStatus === 'DELIVERED') {
    step = 3;
  }

  return [
    {
      key: 'placed',
      title: 'ORDER PLACED',
      subtitle: orderDate || 'Order Received',
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
};

// Helper: map Supabase order record to frontend Order interface
const mapSupabaseOrder = (o: any): Order => {
  const rawStatus = (o.fulfillment_status || o.fulfillmentStatus || 'PROCESSING').toUpperCase();
  const dateStr = o.order_date || (o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US'));
  const parsedLabel = typeof o.shipping_label === 'string' ? JSON.parse(o.shipping_label) : (o.shipping_label || undefined);
  const awbNumber = parsedLabel?.awbNumber || undefined;

  return {
    id: o.id,
    ...(o.user_id ? { userId: o.user_id, user_id: o.user_id } : {}),
    customer: {
      name: o.customer_name || 'Client',
      email: o.customer_email || 'client@example.com',
      avatarInitials: o.customer_avatar || (o.customer_name || 'CL').split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CL',
      avatarUrl: o.customer_avatar_url,
    },
    date: dateStr,
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
    fulfillmentStatus: rawStatus as FulfillmentStatus,
    shippingAddress: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : (o.shipping_address || {
      phone: '',
      pincode: '',
      city: '',
      state: '',
      addressLine: '',
    }),
    shippingMethod: o.shipping_method || 'Complimentary Express Courier (3-5 Business Days)',
    timeline: Array.isArray(o.timeline) && o.timeline.length > 0 ? o.timeline : generateTimelineFromStatus(rawStatus, dateStr, awbNumber),
    shippingLabel: parsedLabel,
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

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreenState] = useState<ScreenView>('home');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true);
  const [pageLoadingLabel, setPageLoadingLabel] = useState<string | null>('Entering Stunning Birds Atelier...');
  const pageLoadingTimeoutRef = useRef<any>(null);

  const triggerPageLoad = useCallback((durationMs = 500, label?: string) => {
    if (pageLoadingTimeoutRef.current) clearTimeout(pageLoadingTimeoutRef.current);
    if (label !== undefined) setPageLoadingLabel(label || null);
    setIsPageLoading(true);
    pageLoadingTimeoutRef.current = setTimeout(() => {
      setIsPageLoading(false);
      setPageLoadingLabel(null);
    }, durationMs);
  }, []);

  const setPageLoading = useCallback((loading: boolean, label?: string) => {
    if (pageLoadingTimeoutRef.current) clearTimeout(pageLoadingTimeoutRef.current);
    if (label !== undefined) setPageLoadingLabel(label || null);
    setIsPageLoading(loading);
    if (!loading) setPageLoadingLabel(null);
  }, []);

  const setCurrentScreen = useCallback((newScreen: ScreenView | ((prev: ScreenView) => ScreenView)) => {
    setCurrentScreenState(prev => {
      const target = typeof newScreen === 'function' ? newScreen(prev) : newScreen;
      if (target !== prev) {
        let label = 'Curating Atelier View...';
        if (target === 'shop') label = 'Curating Handcrafted Collections...';
        else if (target === 'product-detail') label = 'Presenting Atelier Piece...';
        else if (target === 'checkout') label = 'Preparing Secure Checkout...';
        else if (target === 'account') label = 'Loading Patron Sanctuary...';
        else if (target === 'admin-overview' || target === 'admin-orders' || target === 'admin-login') label = 'Accessing Commerce Manager...';
        else if (target === 'home') label = 'Entering Atelier Journal...';
        else if (target === 'login') label = 'Authenticating Patron...';
        else if (target === 'order-success') label = 'Confirming Atelier Commission...';
        else if (target === 'terms-and-conditions') label = 'Loading Terms & Conditions...';
        else if (target === 'privacy-policy') label = 'Loading Privacy Policy...';
        else if (target === 'shipping-policy') label = 'Loading Shipping Policy...';
        else if (target === 'cancellation-and-refund') label = 'Loading Cancellation & Refund Policy...';
        else if (target === 'contact-us') label = 'Connecting to Patron Support...';

        triggerPageLoad(450, label);
      }
      return target;
    });
  }, [triggerPageLoad]);

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product>(INITIAL_PRODUCTS[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [latestPlacedOrder, setLatestPlacedOrder] = useState<Order | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(CURRENT_USER);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics>(ADMIN_METRICS);

  const userProfileRef = useRef<UserProfile>(userProfile);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Open Auth Modal with optional callback and custom prompt message
  const openAuthModal = (
    mode: 'login' | 'register' = 'login',
    redirectAction?: () => void,
    promptMessage?: string
  ) => {
    setAuthModalMode(mode);
    setAuthPromptMessage(promptMessage || null);
    if (redirectAction) {
      setPendingAuthAction(() => redirectAction);
    } else {
      setPendingAuthAction(null);
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthPromptMessage(null);
  };

  // 1. Fetch Products directly from Supabase (or fallback to backend API / INITIAL_PRODUCTS)
  const isFetchingProductsRef = useRef(false);
  const fetchProducts = useCallback(async () => {
    if (isFetchingProductsRef.current) return;
    isFetchingProductsRef.current = true;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_reviews(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase products fetch error:', error);
      } else if (data) {
        const mapped = data.map(mapSupabaseProduct);
        setProducts(mapped);
        setSelectedProduct(prev => mapped.find(p => p.id === prev.id) || mapped[0] || INITIAL_PRODUCTS[0]);
        return;
      }
    } catch (err) {
      console.error('Exception fetching products from Supabase:', err);
    } finally {
      isFetchingProductsRef.current = false;
    }

    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
        setSelectedProduct(data.products[0]);
      }
    } catch {
      setProducts(INITIAL_PRODUCTS);
    }
  }, []);

  // 2. Fetch User Profile, Saved Addresses, Wishlist and Cart from Supabase concurrently
  const fetchUserData = useCallback(async (userId: string, userEmail: string, metaName?: string) => {
    try {
      // Parallelize Supabase data fetches to reduce initial round-trip latency by 75%
      const [
        { data: profile },
        { data: addresses },
        { data: wishlists },
        { data: cartData }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }),
        supabase.from('wishlist_items').select('product_id, products(*)').eq('user_id', userId),
        supabase.from('cart_items').select('*, products(*)').eq('user_id', userId),
      ]);

      const resolvedName = profile?.full_name || metaName || userEmail.split('@')[0];
      const initials = resolvedName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'U';

      const wishlistIds = wishlists && wishlists.length > 0
        ? wishlists.map(w => w.product_id)
        : (profile?.wishlist_product_ids || []);

      const formattedAddresses = (addresses || []).map((a: any) => ({
        id: a.id,
        label: a.label || 'Home',
        addressLine: a.address_line,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        isDefault: Boolean(a.is_default),
      }));

      setUserProfile({
        id: userId,
        name: resolvedName,
        email: userEmail,
        avatarInitials: initials,
        avatarUrl: profile?.avatar_url,
        phone: profile?.phone,
        isAdmin: Boolean(profile?.is_admin),
        isLoggedIn: true,
        societyPoints: profile?.society_points !== undefined ? profile.society_points : 500,
        tier: profile?.tier || 'ARTISAN TIER',
        memberSince: profile?.member_since ? `Member since ${new Date(profile.member_since).getFullYear()}` : 'Member since 2025',
        wishlistProductIds: wishlistIds,
        addresses: formattedAddresses,
      });

      // Synchronize Cart from Supabase (using foreign key joined product or fallback)
      if (cartData && cartData.length > 0) {
        setProducts(currentProds => {
          const prodsToUse = currentProds.length > 0 ? currentProds : INITIAL_PRODUCTS;
          const restoredCart: CartItem[] = cartData.map((c: any) => {
            const prodFromRel = c.products ? mapSupabaseProduct(c.products) : null;
            const matchedProd = prodFromRel || prodsToUse.find(p => p.id === c.product_id) || prodsToUse[0];
            return {
              id: c.id,
              product: matchedProd,
              quantity: c.quantity || 1,
              monogram: c.monogram || undefined,
              foilColor: c.foil_color || undefined,
              selectedColor: c.selected_color || matchedProd.colorName,
            };
          });
          setCart(restoredCart);
          return currentProds;
        });
      }
    } catch (e) {
      console.error('Error fetching user data from Supabase:', e);
    }
  }, []);

  // 3. Fetch Orders for authenticated user or admin
  const isFetchingOrdersRef = useRef(false);
  const refetchTimeoutRef = useRef<any>(null);

  const fetchOrders = useCallback(async (userId?: string, email?: string, isAdmin?: boolean) => {
    // Clean legacy local storage cache immediately so no ghost orders persist in browser
    try {
      localStorage.removeItem('sb_atelier_orders_cache');
    } catch {}

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    let fetchedOrders: Order[] = [];
    const seenOrderIds = new Set<string>();

    const addUniqueOrders = (list: Order[]) => {
      for (const ord of list) {
        if (!ord || !ord.id) continue;
        const normalized = ord.id.replace(/^#/, '').toLowerCase();
        if (!seenOrderIds.has(normalized)) {
          seenOrderIds.add(normalized);
          fetchedOrders.push(ord);
        }
      }
    };

    // Clean direct query: Fetch orders table first, then batch fetch order_items
    try {
      let query = supabase.from('orders').select('*');
      
      if (isAdmin) {
        query = query.order('created_at', { ascending: false });
      } else if (userId || cleanEmail) {
        if (userId && cleanEmail) {
          query = query.or(`user_id.eq.${userId},customer_email.ilike.${cleanEmail}`).order('created_at', { ascending: false });
        } else if (userId) {
          query = query.eq('user_id', userId).order('created_at', { ascending: false });
        } else if (cleanEmail) {
          query = query.ilike('customer_email', cleanEmail).order('created_at', { ascending: false });
        }
      }

      if (isAdmin || userId || cleanEmail) {
        const { data: ordersData, error: ordersError } = await query;
        if (!ordersError && ordersData && ordersData.length > 0) {
          const orderIds = ordersData.map((o: any) => o.id);
          const itemsMap: Record<string, any[]> = {};
          if (orderIds.length > 0) {
            const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);
            if (itemsData) {
              itemsData.forEach((it: any) => {
                if (!itemsMap[it.order_id]) itemsMap[it.order_id] = [];
                itemsMap[it.order_id].push(it);
              });
            }
          }
          const mapped = ordersData.map((o: any) => mapSupabaseOrder({
            ...o,
            order_items: itemsMap[o.id] || o.order_items || [],
          }));
          addUniqueOrders(mapped);
        }
      }
    } catch (err) {
      console.warn('Supabase fetchOrders error:', err);
    }

    setOrders(fetchedOrders);
  }, []);

  const refetchOrders = useCallback(async () => {
    if (isFetchingOrdersRef.current) return;
    isFetchingOrdersRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentProfile = userProfileRef.current;
      if (session?.user) {
        const userEmail = session.user.email || '';
        let isAdm = currentProfile.isAdmin;
        if (!isAdm) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile?.is_admin) isAdm = true;
        }
        await fetchOrders(session.user.id, userEmail, isAdm);
      } else if (currentProfile.email) {
        await fetchOrders(currentProfile.id, currentProfile.email, currentProfile.isAdmin);
      }
    } catch (e) {
      console.warn('refetchOrders caught:', e);
    } finally {
      isFetchingOrdersRef.current = false;
    }
  }, [fetchOrders]);

  // Initial products and session load on mount with smooth luxury reveal
  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    Promise.allSettled([
      fetchProducts(),
      supabase.auth.getSession()
    ]).finally(() => {
      if (!isMounted) return;
      const elapsed = Date.now() - startTime;
      // Around 650ms minimum for clean, luxury entrance, avoiding jarring 10ms flash
      const remaining = Math.max(0, 650 - elapsed);
      setTimeout(() => {
        if (isMounted) {
          setIsPageLoading(false);
          setPageLoadingLabel(null);
        }
      }, remaining);
    });

    // Fallback safety timeout so UI is NEVER blocked even on slow network
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setIsPageLoading(false);
        setPageLoadingLabel(null);
      }
    }, 2200);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [fetchProducts]);

  // Synchronize session on mount, subscribe to auth changes, and listen for live order updates
  useEffect(() => {
    let lastHandledUserId: string | null = undefined as any;

    const handleAuthSession = (session: any) => {
      if (session?.user) {
        if (lastHandledUserId === session.user.id) return;
        lastHandledUserId = session.user.id;
        const userEmail = session.user.email || '';
        const userName = session.user.user_metadata?.full_name || userEmail.split('@')[0];
        setIsLoggedIn(true);
        fetchUserData(session.user.id, userEmail, userName);
        fetchOrders(session.user.id, userEmail, false);
      } else {
        if (lastHandledUserId === null) return;
        lastHandledUserId = null;
        setIsLoggedIn(false);
        setCart([]);
        setOrders([]);
        setUserProfile(CURRENT_USER);
      }
    };

    // onAuthStateChange fires with INITIAL_SESSION on initial load, deduplicating the getSession call
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthSession(session);
    });

    // Debounced realtime handler to prevent rapid duplicate refetches
    const triggerDebouncedRefetch = () => {
      if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
      refetchTimeoutRef.current = setTimeout(() => {
        refetchOrders();
      }, 500);
    };

    // Realtime postgres changes on orders table for instant live sync across client and admin
    const ordersChannel = supabase
      .channel('public_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        triggerDebouncedRefetch
      )
      .subscribe();

    // Window focus / visibility sync: throttled so rapid tab switching does not spam Supabase
    let lastFocusFetchTime = 0;
    const handleWindowFocus = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastFocusFetchTime < 30000) return; // 30s throttle
      lastFocusFetchTime = now;
      triggerDebouncedRefetch();
    };
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      authListener?.subscription?.unsubscribe();
      supabase.removeChannel(ordersChannel);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
      if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
    };
  }, [fetchUserData, fetchOrders, refetchOrders]);

  // Protect private pages with supabase.auth.getSession() — with strict admin verification
  useEffect(() => {
    if (currentScreen === 'admin-overview' || currentScreen === 'admin-orders') {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) {
          setCurrentScreen('admin-login');
          window.location.hash = '/admin-login';
          return;
        }

        const uid = session.user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', uid)
          .maybeSingle();

        if (!profile?.is_admin) {
          setCurrentScreen('admin-login');
          window.location.hash = '/admin-login';
          showToast('Administrative authorization required to access Commerce Manager.');
        }
      });
    } else if (currentScreen === 'account' || currentScreen === 'checkout') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setCurrentScreen('login');
          window.location.hash = '/login';
          openAuthModal('login', undefined, 'Please sign in to access your client portal.');
        }
      });
    }
  }, [currentScreen, openAuthModal, setCurrentScreen]);

  // Synchronize hash and path routing with protection and dynamic product deep-links
  useEffect(() => {
    const handleHashRoute = async () => {
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      const pathname = window.location.pathname.replace(/^\//, '').split('?')[0];
      const currentRoute = hash || pathname;
      const productMatch = currentRoute.match(/^products?\/(.+)$/);

      if (productMatch && productMatch[1]) {
        const targetSlug = decodeURIComponent(productMatch[1]);
        const found = products.find(p => p.slug === targetSlug || p.id === targetSlug);
        if (found) {
          setSelectedProduct(found);
          setCurrentScreen('product-detail');
        } else {
          // Attempt on-demand lookup from Supabase
          try {
            const { data } = await supabase
              .from('products')
              .select('*, product_reviews(*)')
              .or(`slug.eq.${targetSlug},id.eq.${targetSlug}`)
              .maybeSingle();
            if (data) {
              const mapped = mapSupabaseProduct(data);
              setSelectedProduct(mapped);
              setCurrentScreen('product-detail');
            }
          } catch {}
        }
      } else if (currentRoute === 'login') {
        setCurrentScreen('login');
      } else if (currentRoute === 'admin-login' || currentRoute === 'admin/login') {
        setCurrentScreen('admin-login');
      } else if (currentRoute === 'terms-and-conditions' || currentRoute === 'terms') {
        setCurrentScreen('terms-and-conditions');
      } else if (currentRoute === 'privacy-policy' || currentRoute === 'privacy') {
        setCurrentScreen('privacy-policy');
      } else if (currentRoute === 'shipping-policy' || currentRoute === 'shipping') {
        setCurrentScreen('shipping-policy');
      } else if (currentRoute === 'cancellation-and-refund' || currentRoute === 'cancellation-refund' || currentRoute === 'refund-policy') {
        setCurrentScreen('cancellation-and-refund');
      } else if (currentRoute === 'contact-us' || currentRoute === 'contact') {
        setCurrentScreen('contact-us');
      } else if (['admin', 'admin-overview', 'admin-orders'].includes(currentRoute)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCurrentScreen('admin-login');
          window.location.hash = '/admin-login';
          return;
        }

        const uid = session.user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', uid)
          .maybeSingle();

        if (!profile?.is_admin) {
          setCurrentScreen('admin-login');
          window.location.hash = '/admin-login';
          showToast('Access Denied: Administrative privileges required.');
          return;
        }

        if (currentRoute === 'admin-orders') setCurrentScreen('admin-orders');
        else setCurrentScreen('admin-overview');
      } else if (['account', 'checkout'].includes(currentRoute)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCurrentScreen('login');
          window.location.hash = '/login';
        } else {
          if (currentRoute === 'account') setCurrentScreen('account');
          else if (currentRoute === 'checkout') setCurrentScreen('checkout');
        }
      } else if (currentRoute === 'shop') {
        setCurrentScreen('shop');
      }
    };

    window.addEventListener('hashchange', handleHashRoute);
    window.addEventListener('popstate', handleHashRoute);
    handleHashRoute();

    return () => {
      window.removeEventListener('hashchange', handleHashRoute);
      window.removeEventListener('popstate', handleHashRoute);
    };
  }, [products]);

  // Login handler
  const login = async (email: string, password?: string, customName?: string): Promise<boolean> => {
    const displayName = customName || email.split('@')[0].replace(/[\._\-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    setIsAuthModalOpen(false);
    showToast(`Welcome back to the Atelier, ${displayName}.`);

    if (pendingAuthAction) {
      const action = pendingAuthAction;
      setPendingAuthAction(null);
      setTimeout(() => action(), 100);
    }
    return true;
  };

  // Register handler
  const register = async (name: string, email: string, password?: string): Promise<boolean> => {
    setIsAuthModalOpen(false);
    showToast(`Account successfully created. Welcome, ${name}!`);

    if (pendingAuthAction) {
      const action = pendingAuthAction;
      setPendingAuthAction(null);
      setTimeout(() => action(), 100);
    }
    return true;
  };

  // Logout handler
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out of Supabase:', e);
    }
    setIsLoggedIn(false);
    setCart([]);
    setOrders([]);
    setUserProfile(CURRENT_USER);
    showToast('Signed out of the Atelier.');
    setCurrentScreen('home');
    window.location.hash = '/';
  };

  const openProductBySlug = (slugOrId: string) => {
    const found = products.find(p => p.slug === slugOrId || p.id === slugOrId);
    if (found) {
      setSelectedProduct(found);
      setCurrentScreen('product-detail');
      window.location.hash = `products/${found.slug || found.id}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.hash = `products/${slugOrId}`;
    }
  };

  // Cart operations with Supabase persistence
  const addToCart = async (product: Product, quantity = 1, monogram?: string, foilColor?: FoilColor) => {
    const existingIndex = cart.findIndex(
      item => item.product.id === product.id && item.monogram === monogram && item.foilColor === foilColor
    );

    let updatedCart: CartItem[];
    if (existingIndex > -1) {
      updatedCart = [...cart];
      updatedCart[existingIndex].quantity += quantity;
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product,
        quantity,
        monogram: monogram || undefined,
        foilColor: foilColor || undefined,
        selectedColor: product.colorName,
      };
      updatedCart = [...cart, newItem];
    }
    setCart(updatedCart);
    showToast(`Added ${product.name} to your bespoke bag`);
    setIsCartOpen(true);

    // Persist to Supabase if authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('cart_items').upsert({
          user_id: session.user.id,
          product_id: product.id,
          quantity: existingIndex > -1 ? updatedCart[existingIndex].quantity : quantity,
          monogram: monogram || null,
          foil_color: foilColor || null,
          selected_color: product.colorName,
        }, { onConflict: 'user_id,product_id' });
      }
    } catch (e) {
      console.warn('Cart persistence skipped (guest session)');
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    const target = cart.find(i => i.id === cartItemId);
    setCart(cart.filter(item => item.id !== cartItemId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id && target) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', target.product.id);
      }
    } catch {}
  };

  const updateCartQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCart(cart.map(item => item.id === cartItemId ? { ...item, quantity } : item));
    const target = cart.find(i => i.id === cartItemId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id && target) {
        await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', session.user.id)
          .eq('product_id', target.product.id);
      }
    } catch {}
  };

  const cartCount = (cart || []).reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const cartTotal = (cart || []).reduce((sum, item) => sum + ((Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1)), 0);

  // Orders: Place order permanently in Supabase
  // Orders: Place order permanently in Supabase (COD & standard placement)
  const placeOrder = async (orderData: Partial<Order>): Promise<Order> => {
    const { data: { session } } = await supabase.auth.getSession();
    const rawUserId = session?.user?.id || userProfile?.id;
    const isUuid = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const effectiveUserId = isUuid(rawUserId) ? rawUserId : null;

    const subtotal = orderData.subtotal !== undefined ? orderData.subtotal : cartTotal;
    const discountAmount = orderData.discountAmount !== undefined ? orderData.discountAmount : (orderData.discount_amount || 0);
    const couponCode = orderData.couponCode || orderData.coupon_code || undefined;
    const discountPercentage = orderData.discountPercentage || (couponCode ? 10 : undefined);
    const shipping = orderData.shipping !== undefined ? orderData.shipping : 0; // Complimentary express courier
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const taxes = orderData.taxes !== undefined ? orderData.taxes : Math.round(taxableSubtotal * 0.18);
    const total = orderData.total !== undefined ? orderData.total : (taxableSubtotal + shipping + taxes);

    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const orderId = `#ORD-${orderNumber}`;

    const customerName = orderData.customer?.name || userProfile.name || session?.user?.user_metadata?.full_name || 'Valued Patron';
    const customerEmail = orderData.customer?.email || userProfile.email || session?.user?.email || 'patron@example.com';
    const customerAvatar = orderData.customer?.avatarInitials || userProfile.avatarInitials || (customerName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PA');

    const newOrder: Order & { userId?: string; user_id?: string } = {
      id: orderId,
      ...(effectiveUserId ? { userId: effectiveUserId, user_id: effectiveUserId } : (userProfile?.id ? { userId: userProfile.id, user_id: userProfile.id } : {})),
      customer: {
        name: customerName,
        email: customerEmail,
        avatarInitials: customerAvatar,
      },
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0],
        sku: item.product.sku || item.product.skuId || 'SB-ATELIER-01',
        skuId: item.product.skuId || item.product.sku || 'SB-ATELIER-01',
        colorName: item.selectedColor || item.product.colorName,
        price: item.product.price,
        quantity: item.quantity,
        monogram: item.monogram,
        foilColor: item.foilColor,
      })),
      subtotal,
      discountAmount,
      discount_amount: discountAmount,
      couponCode,
      coupon_code: couponCode,
      discountPercentage,
      shipping,
      taxes,
      total,
      paymentMethod: orderData.paymentMethod || 'Cash on Delivery (COD)',
      paymentStatus: 'Pending',
      fulfillmentStatus: 'CRAFTING',
      shippingAddress: orderData.shippingAddress || {
        phone: '',
        pincode: '',
        city: '',
        state: '',
        addressLine: '',
      },
      shippingMethod: orderData.shippingMethod || 'Complimentary Express Courier (3-5 Business Days)',
      timeline: [
        { key: 'placed', title: 'ORDER PLACED', subtitle: 'Cash on Delivery Requested', completed: true, current: false },
        { key: 'confirmed', title: 'CONFIRMED', subtitle: 'Order Verified', completed: true, current: false },
        { key: 'atelier', title: 'AT THE ATELIER', subtitle: 'Cutting & Stitching in Progress', completed: false, current: true },
        { key: 'dispatched', title: 'DISPATCHED', subtitle: 'Pending completion', completed: false, current: false },
      ],
    };

    // Generate courier shipping label with embedded coupon metadata
    const baseShippingLabel = generateShippingLabelData(newOrder, undefined, products);
    newOrder.shippingLabel = {
      ...baseShippingLabel,
      couponCode: couponCode || null,
      discountAmount: discountAmount || 0,
      discountPercentage: discountPercentage || null,
    };

    // 1. Ensure user profile exists in profiles table if authenticated
    if (effectiveUserId) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', effectiveUserId)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from('profiles').upsert({
            id: effectiveUserId,
            full_name: customerName,
            email: customerEmail,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        }
      } catch (profileSeedErr) {
        console.warn('Profile ensure check:', profileSeedErr);
      }
    }

    // 2. Prepare payload conforming strictly to public.orders table schema
    const orderPayload = {
      id: newOrder.id,
      user_id: effectiveUserId,
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

    // 3. Insert order into Supabase
    const { error: orderError } = await supabase.from('orders').insert(orderPayload);
    if (orderError) {
      console.error('Supabase orders table insertion error:', orderError);
      // Fallback: If foreign key violated on user_id, retry without user_id
      if (orderError.code === '23503' && orderPayload.user_id) {
        console.log('Retrying order insert without user_id foreign key...');
        const { error: retryError } = await supabase.from('orders').insert({
          ...orderPayload,
          user_id: null,
        });
        if (retryError) {
          console.error('Retry order insertion failed:', retryError);
          throw new Error(retryError.message || 'Failed to persist order in Supabase database.');
        }
      } else {
        throw new Error(orderError.message || 'Failed to persist order in Supabase database.');
      }
    }

    // 4. Insert line items into public.order_items table
    if (newOrder.items && newOrder.items.length > 0) {
      const orderItemsRows = newOrder.items.map(it => ({
        order_id: newOrder.id,
        product_id: it.productId || null,
        product_name: it.productName || 'Bespoke Piece',
        product_image: it.productImage || '',
        sku: it.sku || it.skuId || 'SB-ATELIER-01',
        color_name: it.colorName || '',
        price: it.price || 0,
        quantity: it.quantity || 1,
        monogram: it.monogram || null,
        foil_color: it.foilColor || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsRows);
      if (itemsError) {
        console.error('Supabase order_items insertion error:', itemsError);
        if (itemsError.code === '23503') {
          console.log('Retrying order_items insert without product_id foreign key constraint...');
          const fallbackItems = orderItemsRows.map(r => ({ ...r, product_id: null }));
          const { error: fallbackErr } = await supabase.from('order_items').insert(fallbackItems);
          if (fallbackErr) {
            console.error('Fallback order_items insert failed:', fallbackErr);
            // Cleanup parent order on failure to maintain integrity
            await supabase.from('orders').delete().eq('id', newOrder.id);
            throw new Error(fallbackErr.message || 'Failed to record order line items.');
          }
        } else {
          // Cleanup parent order on failure to maintain integrity
          await supabase.from('orders').delete().eq('id', newOrder.id);
          throw new Error(itemsError.message || 'Failed to record order line items.');
        }
      }
    }

    // 5. Clean user cart in Supabase
    if (effectiveUserId) {
      try {
        await supabase.from('cart_items').delete().eq('user_id', effectiveUserId);
      } catch (cartErr) {
        console.warn('Cart clean notice:', cartErr);
      }

      // 6. Award society loyalty points in profiles
      try {
        const pointsToAdd = Math.round(total / 10);
        const { data: prof } = await supabase.from('profiles').select('society_points').eq('id', effectiveUserId).maybeSingle();
        const currentPoints = prof?.society_points !== undefined ? prof.society_points : (userProfile.societyPoints || 0);
        const newPoints = currentPoints + pointsToAdd;
        await supabase.from('profiles').update({ society_points: newPoints }).eq('id', effectiveUserId);
        setUserProfile(prev => ({
          ...prev,
          societyPoints: newPoints,
        }));
      } catch (pointsErr) {
        console.warn('Loyalty points update notice:', pointsErr);
      }
    }

    // Update in-memory state & notify user
    setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
    setLatestPlacedOrder(newOrder);
    setCart([]);
    showToast('Your bespoke commission has been placed with the atelier');

    // Automatically trigger confirmation email via Supabase Edge Function (non-blocking)
    sendOrderConfirmationEmail(newOrder.id, newOrder.customer?.email).catch(emailErr => {
      console.warn('Order confirmation email trigger notice (COD):', emailErr);
    });

    return newOrder;
  };

  // Create Verified Order (Called ONLY after Razorpay signature verification succeeds on server)
  const createVerifiedOrder = async (
    orderData: Partial<Order>,
    paymentDetails: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature?: string;
    }
  ): Promise<Order> => {
    const { data: { session } } = await supabase.auth.getSession();
    const rawUserId = session?.user?.id || userProfile?.id;
    const isUuid = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const effectiveUserId = isUuid(rawUserId) ? rawUserId : null;

    // Idempotency: Check if an order with this razorpayPaymentId was already persisted in state
    const existingInState = orders.find(
      o => o.shippingLabel?.razorpayPaymentId === paymentDetails.razorpayPaymentId ||
           (o as any).razorpayPaymentId === paymentDetails.razorpayPaymentId
    );
    if (existingInState) {
      setLatestPlacedOrder(existingInState);
      setCart([]);
      return existingInState;
    }

    const subtotal = orderData.subtotal !== undefined ? orderData.subtotal : cartTotal;
    const discountAmount = orderData.discountAmount !== undefined ? orderData.discountAmount : (orderData.discount_amount || 0);
    const couponCode = orderData.couponCode || orderData.coupon_code || undefined;
    const discountPercentage = orderData.discountPercentage || (couponCode ? 10 : undefined);
    const shipping = orderData.shipping !== undefined ? orderData.shipping : 0;
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const taxes = orderData.taxes !== undefined ? orderData.taxes : Math.round(taxableSubtotal * 0.18);
    const total = orderData.total !== undefined ? orderData.total : (taxableSubtotal + shipping + taxes);

    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const orderId = `#ORD-${orderNumber}`;

    const customerName = orderData.customer?.name || userProfile.name || session?.user?.user_metadata?.full_name || 'Valued Patron';
    const customerEmail = orderData.customer?.email || userProfile.email || session?.user?.email || 'patron@example.com';
    const customerAvatar = orderData.customer?.avatarInitials || userProfile.avatarInitials || (customerName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PA');

    const confirmedTimeline: TimelineStep[] = [
      { key: 'placed', title: 'ORDER PLACED', subtitle: 'Razorpay Verified', completed: true, current: false },
      { key: 'confirmed', title: 'CONFIRMED', subtitle: 'Payment Secured', completed: true, current: false },
      { key: 'atelier', title: 'AT THE ATELIER', subtitle: 'Cutting & Stitching in Progress', completed: false, current: true },
      { key: 'dispatched', title: 'DISPATCHED', subtitle: 'Pending completion', completed: false, current: false },
    ];

    const newOrder: Order & { userId?: string; user_id?: string } = {
      id: orderId,
      ...(effectiveUserId ? { userId: effectiveUserId, user_id: effectiveUserId } : (userProfile?.id ? { userId: userProfile.id, user_id: userProfile.id } : {})),
      customer: {
        name: customerName,
        email: customerEmail,
        avatarInitials: customerAvatar,
      },
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0],
        sku: item.product.sku || item.product.skuId || 'SB-ATELIER-01',
        skuId: item.product.skuId || item.product.sku || 'SB-ATELIER-01',
        colorName: item.selectedColor || item.product.colorName,
        price: item.product.price,
        quantity: item.quantity,
        monogram: item.monogram,
        foilColor: item.foilColor,
      })),
      subtotal,
      discountAmount,
      discount_amount: discountAmount,
      couponCode,
      coupon_code: couponCode,
      discountPercentage,
      shipping,
      taxes,
      total,
      paymentMethod: orderData.paymentMethod || 'Razorpay',
      paymentStatus: 'Paid',
      fulfillmentStatus: 'CRAFTING',
      shippingAddress: orderData.shippingAddress || {
        phone: '',
        pincode: '',
        city: '',
        state: '',
        addressLine: '',
      },
      shippingMethod: orderData.shippingMethod || 'Complimentary Express Courier (3-5 Business Days)',
      timeline: confirmedTimeline,
      razorpayOrderId: paymentDetails.razorpayOrderId,
      razorpayPaymentId: paymentDetails.razorpayPaymentId,
      razorpaySignature: paymentDetails.razorpaySignature,
    };

    // Generate courier shipping label with embedded payment metadata and coupon details
    const baseShippingLabel = generateShippingLabelData(newOrder, undefined, products);
    newOrder.shippingLabel = {
      ...baseShippingLabel,
      couponCode: couponCode || null,
      discountAmount: discountAmount || 0,
      discountPercentage: discountPercentage || null,
      razorpayOrderId: paymentDetails.razorpayOrderId,
      razorpayPaymentId: paymentDetails.razorpayPaymentId,
      razorpaySignature: paymentDetails.razorpaySignature,
    };

    // 1. Ensure user profile exists in profiles table if authenticated
    if (effectiveUserId) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', effectiveUserId)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from('profiles').upsert({
            id: effectiveUserId,
            full_name: customerName,
            email: customerEmail,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        }
      } catch (profileSeedErr) {
        console.warn('Profile ensure check:', profileSeedErr);
      }
    }

    // 2. Prepare payload strictly conforming to public.orders table schema
    const orderPayload = {
      id: newOrder.id,
      user_id: effectiveUserId,
      customer_name: newOrder.customer.name,
      customer_email: newOrder.customer.email,
      customer_avatar: newOrder.customer.avatarInitials,
      order_date: newOrder.date,
      subtotal: newOrder.subtotal,
      shipping: newOrder.shipping,
      taxes: newOrder.taxes,
      total: newOrder.total,
      payment_method: newOrder.paymentMethod,
      payment_status: 'Paid',
      fulfillment_status: 'CRAFTING',
      shipping_address: newOrder.shippingAddress,
      shipping_method: newOrder.shippingMethod,
      timeline: newOrder.timeline,
      shipping_label: newOrder.shippingLabel,
    };

    // 3. Insert order record into Supabase orders table
    const { error: orderError } = await supabase.from('orders').insert(orderPayload);
    if (orderError) {
      console.error('Supabase verified orders insertion error:', orderError);
      // Fallback: If foreign key violated on user_id, retry without user_id
      if (orderError.code === '23503' && orderPayload.user_id) {
        console.log('Retrying verified order insert without user_id foreign key...');
        const { error: retryError } = await supabase.from('orders').insert({
          ...orderPayload,
          user_id: null,
        });
        if (retryError) {
          console.error('Retry verified order insertion failed:', retryError);
          throw new Error(retryError.message || 'Failed to persist verified order in Supabase database.');
        }
      } else {
        throw new Error(orderError.message || 'Failed to persist verified order in Supabase database.');
      }
    }

    // 4. Insert line items into public.order_items table
    if (newOrder.items && newOrder.items.length > 0) {
      const orderItemsRows = newOrder.items.map(it => ({
        order_id: newOrder.id,
        product_id: it.productId || null,
        product_name: it.productName || 'Bespoke Piece',
        product_image: it.productImage || '',
        sku: it.sku || it.skuId || 'SB-ATELIER-01',
        color_name: it.colorName || '',
        price: it.price || 0,
        quantity: it.quantity || 1,
        monogram: it.monogram || null,
        foil_color: it.foilColor || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsRows);
      if (itemsError) {
        console.error('Supabase verified order_items insertion error:', itemsError);
        if (itemsError.code === '23503') {
          console.log('Retrying verified order_items insert without product_id foreign key constraint...');
          const fallbackItems = orderItemsRows.map(r => ({ ...r, product_id: null }));
          const { error: fallbackErr } = await supabase.from('order_items').insert(fallbackItems);
          if (fallbackErr) {
            console.error('Fallback verified order_items insert failed:', fallbackErr);
            // Cleanup parent order on failure to maintain integrity
            await supabase.from('orders').delete().eq('id', newOrder.id);
            throw new Error(fallbackErr.message || 'Failed to record verified order line items.');
          }
        } else {
          // Cleanup parent order on failure to maintain integrity
          await supabase.from('orders').delete().eq('id', newOrder.id);
          throw new Error(itemsError.message || 'Failed to record verified order line items.');
        }
      }
    }

    // 5. Clean user cart in Supabase
    if (effectiveUserId) {
      try {
        await supabase.from('cart_items').delete().eq('user_id', effectiveUserId);
      } catch (cartErr) {
        console.warn('Cart clean notice:', cartErr);
      }

      // 6. Award society loyalty points in profiles
      try {
        const pointsToAdd = Math.round(total / 10);
        const { data: prof } = await supabase.from('profiles').select('society_points').eq('id', effectiveUserId).maybeSingle();
        const currentPoints = prof?.society_points !== undefined ? prof.society_points : (userProfile.societyPoints || 0);
        const newPoints = currentPoints + pointsToAdd;
        await supabase.from('profiles').update({ society_points: newPoints }).eq('id', effectiveUserId);
        setUserProfile(prev => ({
          ...prev,
          societyPoints: newPoints,
        }));
      } catch (pointsErr) {
        console.warn('Points award notice:', pointsErr);
      }
    }

    // 7. Update active in-memory state and notification
    setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
    setLatestPlacedOrder(newOrder);
    setCart([]);
    setUserProfile(prev => ({
      ...prev,
      societyPoints: (prev.societyPoints || 0) + Math.round(total / 10),
    }));

    showToast('Payment verified successfully. Welcome to Stunning Birds Atelier.');

    // Automatically trigger confirmation email via Supabase Edge Function (non-blocking)
    sendOrderConfirmationEmail(newOrder.id, newOrder.customer?.email).catch(emailErr => {
      console.warn('Order confirmation email trigger notice (Online/Razorpay):', emailErr);
    });

    return newOrder;
  };

  const updateOrderShippingLabel = (orderId: string, label: ShippingLabel) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, shippingLabel: label } : o));
    supabase.from('orders').update({ shipping_label: label }).eq('id', orderId).then();
  };

  const regenerateShippingLabel = async (orderId: string): Promise<ShippingLabel> => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) throw new Error('Order not found');
    const newLabel = generateShippingLabelData(targetOrder, undefined, products);
    updateOrderShippingLabel(orderId, newLabel);
    showToast(`Regenerated courier label for ${orderId}`);
    return newLabel;
  };

  const updateOrderStatus = async (orderId: string, fulfillmentStatus?: string, paymentStatus?: string) => {
    const updates: any = {};
    if (fulfillmentStatus) {
      updates.fulfillment_status = fulfillmentStatus;
      updates.timeline = generateTimelineFromStatus(fulfillmentStatus);
    }
    if (paymentStatus) {
      updates.payment_status = paymentStatus;
    }

    try {
      await supabase.from('orders').update(updates).eq('id', orderId);
    } catch (e) {
      console.warn('Error updating order in Supabase:', e);
    }

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o };
        if (fulfillmentStatus) {
          updated.fulfillmentStatus = fulfillmentStatus as any;
          updated.timeline = generateTimelineFromStatus(fulfillmentStatus, updated.date, updated.shippingLabel?.awbNumber);
        }
        if (paymentStatus) {
          updated.paymentStatus = paymentStatus as any;
        }
        return updated;
      }
      return o;
    }));
    showToast(`Order ${orderId} status updated in database`);
  };

  const bulkUpdateOrderStatus = async (
    orderIds: string[],
    fulfillmentStatus: FulfillmentStatus
  ): Promise<{ success: boolean; updatedCount: number; failedCount: number; message: string; failedOrders?: Array<{ id: string; reason: string }> }> => {
    if (!orderIds || orderIds.length === 0) {
      const msg = 'No orders selected for bulk status update.';
      showToast(msg);
      return { success: false, updatedCount: 0, failedCount: 0, message: msg };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Call secure server endpoint to validate admin authorization and apply updates atomically
      const response = await fetch('/api/admin/orders/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderIds,
          fulfillmentStatus,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        const updatedIds: string[] = data.updatedOrderIds || orderIds;
        // 2. Synchronize local orders state in React
        setOrders(prev => prev.map(o => {
          const isTarget = updatedIds.some(id => id === o.id || id.replace(/^#/, '') === o.id.replace(/^#/, ''));
          if (isTarget) {
            return {
              ...o,
              fulfillmentStatus,
              timeline: generateTimelineFromStatus(fulfillmentStatus, o.date, o.shippingLabel?.awbNumber),
            };
          }
          return o;
        }));

        // 3. Trigger immediate refetch to sync any real-time DB changes
        try {
          await refetchOrders();
        } catch (rErr) {
          console.warn('Orders refetch notice:', rErr);
        }

        const msg = data.message || `${data.updatedCount || updatedIds.length} orders updated to ${fulfillmentStatus}`;
        showToast(msg);
        return {
          success: true,
          updatedCount: data.updatedCount || updatedIds.length,
          failedCount: data.failedCount || 0,
          message: msg,
          failedOrders: data.failedOrders,
        };
      } else {
        const errorMsg = data.error || data.message || 'Failed to update order status';
        showToast(errorMsg);
        return {
          success: false,
          updatedCount: data.updatedCount || 0,
          failedCount: data.failedCount || orderIds.length,
          message: errorMsg,
          failedOrders: data.failedOrders,
        };
      }
    } catch (err: any) {
      console.error('Error during bulk order status update:', err);
      const errMsg = `Error updating orders: ${err?.message || 'Unknown network error'}`;
      showToast(errMsg);
      return {
        success: false,
        updatedCount: 0,
        failedCount: orderIds.length,
        message: errMsg,
      };
    }
  };

  const deleteOrder = async (orderId: string): Promise<boolean> => {
    // 1. Verify authenticated admin session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user?.id) {
      const authErr = 'Authentication Required: Please sign in as an administrator to delete orders.';
      console.error(authErr);
      showToast(authErr);
      return false;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('Error fetching admin profile from Supabase:', profileErr);
    }

    const isAdmin = Boolean(profile?.is_admin) || userProfile.isAdmin;

    if (!isAdmin) {
      const authErr = 'Access denied: Administrative privileges required to delete orders.';
      console.error(authErr);
      showToast(authErr);
      return false;
    }

    // Immediately remove any legacy localStorage cache
    try {
      localStorage.removeItem('sb_atelier_orders_cache');
    } catch {}

    try {
      // 2. Resolve all possible key representations (e.g. "ORD-123", "#ORD-123", raw id)
      let targetId = orderId;
      const cleanId = orderId.replace(/^#/, '');
      const hashId = `#${cleanId}`;
      const targetIds = Array.from(new Set([orderId, cleanId, hashId])).filter(Boolean);

      const { data: existingRows } = await supabase
        .from('orders')
        .select('id')
        .in('id', targetIds);

      if (existingRows && existingRows.length > 0) {
        targetId = existingRows[0].id;
      }

      // 3. Delete associated order_items first to guarantee clean foreign key removal
      try {
        await supabase
          .from('order_items')
          .delete()
          .in('order_id', targetIds);
      } catch (itemsDelErr) {
        console.warn('order_items delete note:', itemsDelErr);
      }

      // 4. Perform real Supabase DELETE on public.orders
      const { error } = await supabase
        .from('orders')
        .delete({ count: 'exact' })
        .in('id', targetIds);

      // Check returned error from Supabase
      if (error) {
        console.error('Supabase DELETE on public.orders failed:', error);
        const codePrefix = error.code ? `[Error ${error.code}] ` : '';
        const detailSuffix = error.details ? ` Details: ${error.details}` : '';
        const hintSuffix = error.hint ? ` Hint: ${error.hint}` : '';
        showToast(`Supabase DELETE failed: ${codePrefix}${error.message}${detailSuffix}${hintSuffix}`);
        return false;
      }

      // 5. Perform a SELECT by the order IDs after DELETE to confirm the row is actually gone
      const { data: remainingRows, error: selectErr } = await supabase
        .from('orders')
        .select('id')
        .in('id', targetIds);

      if (selectErr) {
        console.warn('Post-delete verification query warning:', selectErr);
      }

      // If the row still exists in public.orders, identify why and do NOT update frontend state
      if (remainingRows && remainingRows.length > 0) {
        const reason = `Supabase deletion blocked: row still exists in Supabase. Row Level Security (RLS) or database permissions prevented deleting order ${targetId}.`;
        console.error(reason, { targetIds, remainingRows });
        showToast(reason);
        return false;
      }

      // 6. Update frontend React state ONLY after Supabase confirms the row is deleted
      setOrders(prev => prev.filter(o => !targetIds.includes(o.id) && !targetIds.includes(o.id.replace(/^#/, ''))));

      if (latestPlacedOrder && (targetIds.includes(latestPlacedOrder.id) || targetIds.includes(latestPlacedOrder.id.replace(/^#/, '')))) {
        setLatestPlacedOrder(null);
      }

      // 7. Synchronize in-memory backend cache if applicable
      const { data: { session } } = await supabase.auth.getSession();
      for (const tid of targetIds) {
        try {
          await fetch(`/api/orders/${encodeURIComponent(tid)}`, {
            method: 'DELETE',
            headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {},
          });
        } catch {}
      }

      showToast(`Order ${targetId} permanently deleted from Supabase.`);
      return true;
    } catch (err: any) {
      console.error('Unexpected exception during Supabase order deletion:', err);
      showToast(`Error deleting order: ${err?.message || 'Unknown database error'}`);
      return false;
    }
  };

  const cancelCustomerOrder = async (orderId: string, reason?: string, note?: string): Promise<{ success: boolean; message?: string; order?: Order }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Call secure backend endpoint to enforce server-side validation & atomic DB update
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ 
          reason: reason || 'Cancelled by Patron',
          note: note || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.message || 'Unable to cancel order.';
        showToast(errorMsg);
        return { success: false, message: errorMsg };
      }

      // 2. Synchronize frontend React state with the updated cancelled order
      const returnedOrder = data.order;
      setOrders(prev => prev.map(o => {
        if (o.id === orderId || o.id.replace(/^#/, '') === orderId.replace(/^#/, '')) {
          if (returnedOrder) {
            return {
              ...o,
              fulfillmentStatus: 'CANCELLED',
              timeline: returnedOrder.timeline && returnedOrder.timeline.length > 0 
                ? returnedOrder.timeline 
                : generateTimelineFromStatus('CANCELLED', o.date, o.shippingLabel?.awbNumber),
            };
          }
          return {
            ...o,
            fulfillmentStatus: 'CANCELLED',
            timeline: generateTimelineFromStatus('CANCELLED', o.date, o.shippingLabel?.awbNumber),
          };
        }
        return o;
      }));

      if (latestPlacedOrder && (latestPlacedOrder.id === orderId || latestPlacedOrder.id.replace(/^#/, '') === orderId.replace(/^#/, ''))) {
        setLatestPlacedOrder(prev => prev ? {
          ...prev,
          fulfillmentStatus: 'CANCELLED',
          timeline: returnedOrder?.timeline && returnedOrder.timeline.length > 0
            ? returnedOrder.timeline
            : generateTimelineFromStatus('CANCELLED', prev.date, prev.shippingLabel?.awbNumber),
        } : null);
      }

      showToast(`Order ${orderId} has been successfully cancelled.`);
      refetchOrders();
      return { success: true, message: data.message, order: returnedOrder };
    } catch (err: any) {
      console.error('Order cancellation error:', err);
      const errMsg = err?.message || 'An unexpected error occurred during cancellation.';
      showToast(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const markOrderAsRefunded = async (orderId: string): Promise<{ success: boolean; message?: string; order?: Order }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        const authErr = 'Authentication Required: Please sign in as an administrator to mark orders as refunded.';
        showToast(authErr);
        return { success: false, message: authErr };
      }

      // 1. Call secure backend endpoint to enforce server-side validation & persistence
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/mark-refunded`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.message || 'Unable to mark order as refunded.';
        showToast(errorMsg);
        return { success: false, message: errorMsg };
      }

      // 2. Synchronize frontend React state with the updated refunded order
      const returnedOrder = data.order;
      setOrders(prev => prev.map(o => {
        if (o.id === orderId || o.id.replace(/^#/, '') === orderId.replace(/^#/, '')) {
          return {
            ...o,
            paymentStatus: 'Refunded',
            ...(returnedOrder ? returnedOrder : {}),
          };
        }
        return o;
      }));

      if (latestPlacedOrder && (latestPlacedOrder.id === orderId || latestPlacedOrder.id.replace(/^#/, '') === orderId.replace(/^#/, ''))) {
        setLatestPlacedOrder(prev => prev ? {
          ...prev,
          paymentStatus: 'Refunded',
          ...(returnedOrder ? returnedOrder : {}),
        } : null);
      }

      showToast(`Order ${orderId} marked as Refunded successfully.`);
      refetchOrders();
      return { success: true, message: data.message, order: returnedOrder };
    } catch (err: any) {
      console.error('Mark order refunded error:', err);
      const errMsg = err?.message || 'An unexpected error occurred while updating refund status.';
      showToast(errMsg);
      return { success: false, message: errMsg };
    }
  };

  // Product Admin Operations with direct Supabase Storage & Database persistence
  const addNewProduct = async (productData: Partial<Product>) => {
    const formattedSku = (productData.sku || productData.skuId || '').trim();
    const finalSku = formattedSku || `SB-${(productData.name || 'PIECE').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const newProdId = `prod-${Date.now()}`;

    // Upload any newly selected images directly to Supabase Storage 'product-images' bucket
    let finalImages: string[] = ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85'];
    if (productData.images && productData.images.length > 0) {
      try {
        finalImages = await uploadProductImagesList(newProdId, productData.images);
      } catch (uploadErr: any) {
        console.error('CRITICAL: Supabase Storage image upload failed during product creation:', uploadErr);
        const errMsg = uploadErr?.message || 'Storage upload failed';
        showToast(`Image upload failed: ${errMsg}. Product creation halted.`);
        throw new Error(`Product image upload failed: ${errMsg}`);
      }
    }

    // Strict validation: Ensure NO base64 data URLs or blob URLs slip into PostgreSQL
    const containsBase64 = finalImages.some(img => typeof img === 'string' && (img.startsWith('data:') || img.startsWith('blob:')));
    if (containsBase64) {
      const invalidImgErr = new Error('Product images must be valid Supabase Storage URLs or external HTTPS URLs, not raw base64 data.');
      console.error(invalidImgErr);
      showToast('Image validation error: raw base64 data is not allowed in the database.');
      throw invalidImgErr;
    }

    const sellingPrice = productData.sellingPrice !== undefined 
      ? Number(productData.sellingPrice) 
      : (productData.price !== undefined ? Number(productData.price) : 12800);
    const mrpPrice = productData.mrp !== undefined && productData.mrp !== null 
      ? Number(productData.mrp) 
      : (productData.originalPrice !== undefined && productData.originalPrice !== null ? Number(productData.originalPrice) : undefined);

    const newProd: Product = {
      id: newProdId,
      slug: (productData.name || 'new-piece').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku: finalSku,
      skuId: finalSku,
      name: productData.name || 'Bespoke Atelier Piece',
      price: sellingPrice,
      sellingPrice: sellingPrice,
      selling_price: sellingPrice,
      originalPrice: mrpPrice,
      mrp: mrpPrice,
      original_price: mrpPrice,
      category: productData.category || 'Bifold Wallets',
      colorName: productData.colorName || 'Espresso Bridle',
      colorHex: productData.colorHex || '#3a2012',
      material: productData.material || 'Full-Grain Tuscan Leather',
      dimensions: productData.dimensions || '',
      rating: 5.0,
      reviewsCount: 1,
      badge: productData.badge || 'NEW',
      inStock: productData.inStock !== false,
      stockQuantity: productData.stockQuantity || 50,
      images: finalImages,
      description: productData.description || 'Masterfully crafted luxury leather good.',
      materialsDetails: productData.materialsDetails || 'Natural vegetable-tanned hide with beeswax burnished edges.',
      careInstructions: productData.careInstructions || 'Condition twice a year with natural balm.',
      shippingInfo: productData.shippingInfo || 'Complimentary express courier.',
      monogramAvailable: productData.monogramAvailable ?? true,
      featured: Boolean(productData.featured),
      isNewArrival: Boolean(productData.isNewArrival),
      productHighlights: productData.productHighlights || [],
      seoTitle: productData.seoTitle || productData.seo_title,
      seo_title: productData.seoTitle || productData.seo_title,
      seoMetaDescription: productData.seoMetaDescription || productData.seo_meta_description,
      seo_meta_description: productData.seoMetaDescription || productData.seo_meta_description,
      reviews: [],
    };

    // Store SEO metadata locally for instant resilience
    const effectiveSeoTitle = productData.seoTitle || productData.seo_title;
    const effectiveSeoDesc = productData.seoMetaDescription || productData.seo_meta_description;
    if (effectiveSeoTitle || effectiveSeoDesc) {
      const seoMap = getStoredSeoMetadataMap();
      seoMap[newProd.id] = {
        seoTitle: effectiveSeoTitle,
        seoMetaDescription: effectiveSeoDesc,
      };
      if (newProd.slug) {
        seoMap[newProd.slug] = {
          seoTitle: effectiveSeoTitle,
          seoMetaDescription: effectiveSeoDesc,
        };
      }
      saveStoredSeoMetadataMap(seoMap);
    }

    try {
      const insertPayload: any = {
        id: newProd.id,
        sku: newProd.sku,
        slug: newProd.slug,
        name: newProd.name,
        price: newProd.price,
        original_price: newProd.originalPrice,
        category: newProd.category,
        color_name: newProd.colorName,
        color_hex: newProd.colorHex,
        material: newProd.material,
        dimensions: newProd.dimensions,
        rating: newProd.rating,
        reviews_count: newProd.reviewsCount,
        badge: newProd.badge,
        in_stock: newProd.inStock,
        stock_quantity: newProd.stockQuantity,
        images: newProd.images,
        description: newProd.description,
        materials_details: newProd.materialsDetails,
        care_instructions: newProd.careInstructions,
        shipping_info: newProd.shippingInfo,
        monogram_available: newProd.monogramAvailable,
        featured: newProd.featured,
        is_new_arrival: newProd.isNewArrival,
        product_highlights: newProd.productHighlights,
      };

      if (newProd.seoTitle) {
        insertPayload.seo_title = newProd.seoTitle;
      }
      if (newProd.seoMetaDescription) {
        insertPayload.seo_description = newProd.seoMetaDescription;
      }

      let { error: insertErr } = await supabase.from('products').insert(insertPayload);
      if (insertErr && (insertErr.message?.includes('seo_title') || insertErr.message?.includes('seo_description'))) {
        delete insertPayload.seo_title;
        delete insertPayload.seo_description;
        const retryResult = await supabase.from('products').insert(insertPayload);
        insertErr = retryResult.error;
      }

      if (insertErr) {
        console.error('Failed to insert product into Supabase:', insertErr);
        showToast(`Failed to save product in database: ${insertErr.message}`);
        throw new Error(`Database insert error: ${insertErr.message}`);
      }
    } catch (dbErr) {
      console.error('Failed to insert product into Supabase:', dbErr);
      throw dbErr;
    }

    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (adminSession?.access_token) {
        await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify(newProd),
        });
      }
    } catch {}

    if (productData.linkedVariantIds && productData.linkedVariantIds.length > 0) {
      const storedMap = getStoredVariantLinksMap();
      const allCluster = Array.from(new Set([newProd.id, ...productData.linkedVariantIds]));
      allCluster.forEach(memberId => {
        const others = allCluster.filter(oid => oid !== memberId);
        storedMap[memberId] = {
          variantGroup: productData.variantGroup || storedMap[memberId]?.variantGroup || '',
          linkedVariantIds: others,
        };
      });
      saveStoredVariantLinksMap(storedMap);

      const finalMap = getStoredVariantLinksMap();
      setProducts(prev => [
        { ...newProd, variantGroup: productData.variantGroup, linkedVariantIds: productData.linkedVariantIds },
        ...prev.map(p => {
          if (finalMap[p.id]) {
            return {
              ...p,
              variantGroup: finalMap[p.id].variantGroup || p.variantGroup,
              linkedVariantIds: finalMap[p.id].linkedVariantIds,
            };
          }
          return p;
        }),
      ]);
    } else {
      setProducts([newProd, ...products]);
    }

    showToast(`Created new product: ${newProd.name} with Supabase Storage images`);
  };

  const updateProduct = async (productId: string, updatedFields: Partial<Product>) => {
    const targetProd = products.find(p => p.id === productId || p.slug === productId);
    const resolvedId = targetProd?.id || productId;

    const resolvedPrice = updatedFields.sellingPrice !== undefined 
      ? (updatedFields.sellingPrice === null ? undefined : Number(updatedFields.sellingPrice))
      : (updatedFields.price !== undefined ? (updatedFields.price === null ? undefined : Number(updatedFields.price)) : undefined);
    
    const resolvedMrp = updatedFields.mrp !== undefined 
      ? (updatedFields.mrp === null || updatedFields.mrp === 0 ? null : Number(updatedFields.mrp))
      : (updatedFields.originalPrice !== undefined ? (updatedFields.originalPrice === null || updatedFields.originalPrice === 0 ? null : Number(updatedFields.originalPrice)) : undefined);

    const supabasePayload: any = {};
    if (updatedFields.name !== undefined) supabasePayload.name = updatedFields.name;
    if (resolvedPrice !== undefined) supabasePayload.price = resolvedPrice;
    if (resolvedMrp !== undefined) supabasePayload.original_price = resolvedMrp;
    if (updatedFields.sku !== undefined || updatedFields.skuId !== undefined) {
      supabasePayload.sku = updatedFields.sku || updatedFields.skuId;
    }
    if (updatedFields.category !== undefined) supabasePayload.category = updatedFields.category;
    if (updatedFields.colorName !== undefined) supabasePayload.color_name = updatedFields.colorName;
    if (updatedFields.colorHex !== undefined) supabasePayload.color_hex = updatedFields.colorHex;
    if (updatedFields.material !== undefined) supabasePayload.material = updatedFields.material;
    if (updatedFields.inStock !== undefined) supabasePayload.in_stock = updatedFields.inStock;
    if (updatedFields.stockQuantity !== undefined) supabasePayload.stock_quantity = Number(updatedFields.stockQuantity);
    if (updatedFields.productHighlights !== undefined) supabasePayload.product_highlights = updatedFields.productHighlights;
    if (updatedFields.featured !== undefined) supabasePayload.featured = updatedFields.featured;
    if (updatedFields.isNewArrival !== undefined) supabasePayload.is_new_arrival = updatedFields.isNewArrival;
    if (updatedFields.seoTitle !== undefined || updatedFields.seo_title !== undefined) {
      supabasePayload.seo_title = updatedFields.seoTitle || updatedFields.seo_title || null;
    }
    if (updatedFields.seoMetaDescription !== undefined || updatedFields.seo_meta_description !== undefined) {
      supabasePayload.seo_description = updatedFields.seoMetaDescription || updatedFields.seo_meta_description || null;
    }

    let finalImages = updatedFields.images;
    if (updatedFields.images !== undefined) {
      // 1. Remove deleted images from Supabase Storage (protecting images used by other products)
      const oldImages = targetProd?.images || [];
      const keptUrls = updatedFields.images.filter(img => typeof img === 'string' && !img.startsWith('data:') && !img.startsWith('blob:'));
      const removedImages = oldImages.filter(oldUrl => !keptUrls.includes(oldUrl));

      const otherReferencedUrls = products
        .filter(p => p.id !== resolvedId)
        .flatMap(p => p.images || []);

      if (removedImages.length > 0) {
        deleteProductImagesFromStorage(removedImages, otherReferencedUrls).catch(e => 
          console.warn('Image deletion notice:', e)
        );
      }

      // 2. Upload newly added images (base64 data URLs or File blobs) to Supabase Storage
      try {
        finalImages = await uploadProductImagesList(resolvedId, updatedFields.images);
      } catch (err: any) {
        console.error('CRITICAL: Supabase Storage image upload failed during product update:', err);
        const errMsg = err?.message || 'Storage upload error';
        showToast(`Image upload failed: ${errMsg}. Product update halted.`);
        throw new Error(`Product image update failed: ${errMsg}`);
      }

      // Strict validation: Ensure NO base64 data URLs or blob URLs slip into PostgreSQL
      const containsBase64 = (finalImages || []).some(img => typeof img === 'string' && (img.startsWith('data:') || img.startsWith('blob:')));
      if (containsBase64) {
        const invalidImgErr = new Error('Product images must be valid Supabase Storage URLs or external HTTPS URLs, not raw base64 data.');
        console.error(invalidImgErr);
        showToast('Image validation error: raw base64 data is not allowed in the database.');
        throw invalidImgErr;
      }

      supabasePayload.images = finalImages;
    }

    try {
      let { error: updateErr } = await supabase.from('products').update(supabasePayload).eq('id', resolvedId);
      if (updateErr && (updateErr.message?.includes('seo_title') || updateErr.message?.includes('seo_description'))) {
        delete supabasePayload.seo_title;
        delete supabasePayload.seo_description;
        const retryResult = await supabase.from('products').update(supabasePayload).eq('id', resolvedId);
        updateErr = retryResult.error;
      }
      if (updateErr) {
        console.error('Failed to update product in Supabase:', updateErr);
        showToast(`Failed to update product in database: ${updateErr.message}`);
        throw new Error(`Database update error: ${updateErr.message}`);
      }
    } catch (dbErr) {
      console.error('Failed to update product in Supabase:', dbErr);
      throw dbErr;
    }

    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (adminSession?.access_token) {
        await fetch(`/api/products/${encodeURIComponent(resolvedId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify(updatedFields),
        });
      }
    } catch {}

    // Synchronize colour variant links bidirectionally while preserving each variant's fields independently
    if (updatedFields.variantGroup !== undefined || updatedFields.linkedVariantIds !== undefined) {
      const storedMap = getStoredVariantLinksMap();
      const currentLinked = updatedFields.linkedVariantIds !== undefined 
        ? updatedFields.linkedVariantIds 
        : (targetProd?.linkedVariantIds || []);
      const newGroup = updatedFields.variantGroup !== undefined 
        ? updatedFields.variantGroup 
        : (targetProd?.variantGroup || '');
      const allCluster = Array.from(new Set([resolvedId, ...currentLinked]));

      if (currentLinked.length > 0) {
        allCluster.forEach(memberId => {
          const others = allCluster.filter(oid => oid !== memberId);
          storedMap[memberId] = {
            variantGroup: newGroup || storedMap[memberId]?.variantGroup || '',
            linkedVariantIds: others,
          };
        });
      } else {
        const oldLinked = targetProd?.linkedVariantIds || [];
        oldLinked.forEach(oldId => {
          if (storedMap[oldId]) {
            storedMap[oldId].linkedVariantIds = storedMap[oldId].linkedVariantIds.filter(id => id !== resolvedId);
          }
        });
        storedMap[resolvedId] = {
          variantGroup: newGroup,
          linkedVariantIds: [],
        };
      }
      saveStoredVariantLinksMap(storedMap);
    }

    const nextSeoTitle = updatedFields.seoTitle !== undefined ? updatedFields.seoTitle : (updatedFields.seo_title !== undefined ? updatedFields.seo_title : targetProd?.seoTitle);
    const nextSeoDesc = updatedFields.seoMetaDescription !== undefined ? updatedFields.seoMetaDescription : (updatedFields.seo_meta_description !== undefined ? updatedFields.seo_meta_description : targetProd?.seoMetaDescription);
    if (nextSeoTitle !== undefined || nextSeoDesc !== undefined) {
      const seoMap = getStoredSeoMetadataMap();
      seoMap[resolvedId] = {
        seoTitle: nextSeoTitle,
        seoMetaDescription: nextSeoDesc,
      };
      if (targetProd?.slug) {
        seoMap[targetProd.slug] = {
          seoTitle: nextSeoTitle,
          seoMetaDescription: nextSeoDesc,
        };
      }
      saveStoredSeoMetadataMap(seoMap);
    }

    const finalStoredLinks = getStoredVariantLinksMap();

    setProducts(prev => prev.map(p => {
      if (p.id === productId || p.slug === productId || p.id === resolvedId) {
        const nextPrice = resolvedPrice !== undefined ? resolvedPrice : p.price;
        const nextMrp = resolvedMrp !== undefined ? (resolvedMrp === null ? undefined : resolvedMrp) : p.originalPrice;
        const targetLink = finalStoredLinks[p.id];
        const updated: Product = {
          ...p,
          ...updatedFields,
          seoTitle: nextSeoTitle,
          seo_title: nextSeoTitle,
          seoMetaDescription: nextSeoDesc,
          seo_meta_description: nextSeoDesc,
          variantGroup: updatedFields.variantGroup !== undefined ? updatedFields.variantGroup : (targetLink?.variantGroup ?? p.variantGroup),
          linkedVariantIds: updatedFields.linkedVariantIds !== undefined ? updatedFields.linkedVariantIds : (targetLink?.linkedVariantIds ?? p.linkedVariantIds),
          price: nextPrice,
          sellingPrice: nextPrice,
          selling_price: nextPrice,
          originalPrice: nextMrp,
          mrp: nextMrp,
          original_price: nextMrp,
          images: finalImages || p.images,
          sku: updatedFields.sku || updatedFields.skuId || p.sku,
          skuId: updatedFields.skuId || updatedFields.sku || p.skuId || p.sku,
        };
        if (selectedProduct.id === p.id) {
          setSelectedProduct(updated);
        }
        return updated;
      }

      // If p is one of the linked or unlinked variants, update only its variant link references
      if (finalStoredLinks[p.id]) {
        return {
          ...p,
          variantGroup: finalStoredLinks[p.id].variantGroup !== undefined ? finalStoredLinks[p.id].variantGroup : p.variantGroup,
          linkedVariantIds: finalStoredLinks[p.id].linkedVariantIds,
        };
      }

      return p;
    }));
    showToast(`Updated product and synced variants`);
  };

  const deleteProduct = async (productId: string): Promise<boolean> => {
    const targetProd = products.find(p => p.id === productId || p.slug === productId || p.sku === productId);
    const resolvedId = targetProd?.id || productId;

    // 1. Verify authenticated session & admin role from database profiles.is_admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user?.id) {
      const authErr = 'Authentication Required: Please sign in as an administrator.';
      console.error(authErr);
      showToast(authErr);
      return false;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('Error fetching admin profile from Supabase:', profileErr);
    }

    const isAdmin = Boolean(profile?.is_admin);

    if (!isAdmin) {
      const authErr = 'Access denied — only admin can do this.';
      console.error(authErr);
      showToast(authErr);
      return false;
    }

    try {
      // 2. Perform real Supabase DELETE directly on public.products table
      // In PostgreSQL:
      // - order_items.product_id has ON DELETE SET NULL (preserves all historical orders & receipt snapshots)
      // - cart_items, wishlist_items, product_reviews have ON DELETE CASCADE
      const { error: deleteError } = await supabase
        .from('products')
        .delete({ count: 'exact' })
        .eq('id', resolvedId);

      if (deleteError) {
        console.error('Supabase product deletion failed:', deleteError);
        const codePrefix = deleteError.code ? `[${deleteError.code}] ` : '';
        const detailSuffix = deleteError.details ? ` Details: ${deleteError.details}` : '';
        const hintSuffix = deleteError.hint ? ` Hint: ${deleteError.hint}` : '';
        showToast(`Supabase product deletion failed: ${codePrefix}${deleteError.message}${detailSuffix}${hintSuffix}`);
        return false;
      }

      // 3. Verify product is no longer present in public.products table
      const { data: checkData, error: verifyQueryErr } = await supabase
        .from('products')
        .select('id')
        .eq('id', resolvedId)
        .maybeSingle();

      if (verifyQueryErr) {
        console.warn('Note: Verification query returned error:', verifyQueryErr);
      }

      if (checkData) {
        const verifyErr = 'Product deletion could not be confirmed: row still exists in Supabase products table.';
        console.error(verifyErr);
        showToast(verifyErr);
        return false;
      }

      // 4. Clean up associated files in Supabase Storage (protecting images used by other products)
      try {
        const otherReferencedUrls = products
          .filter(p => p.id !== resolvedId)
          .flatMap(p => p.images || []);

        await deleteProductFolderFromStorage(resolvedId, targetProd?.images, otherReferencedUrls);
      } catch (storageErr) {
        console.warn('Storage asset cleanup note:', storageErr);
      }


      // 5. Sync with server API cache if active
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        await fetch(`/api/products/${encodeURIComponent(resolvedId)}`, {
          method: 'DELETE',
          headers: currentSession?.access_token ? { 'Authorization': `Bearer ${currentSession.access_token}` } : {},
        });
      } catch {}

      // 6. Only after Supabase DELETE succeeds and is verified, update React state
      setProducts(prev => prev.filter(p => p.id !== productId && p.slug !== productId && p.id !== resolvedId));
      setSelectedProduct(prev => {
        if (prev.id === productId || prev.slug === productId || prev.id === resolvedId) {
          const remaining = products.filter(p => p.id !== productId && p.slug !== productId && p.id !== resolvedId);
          return remaining[0] || INITIAL_PRODUCTS[0];
        }
        return prev;
      });

      showToast(`Piece "${targetProd?.name || resolvedId}" permanently deleted from Supabase.`);
      return true;
    } catch (err: any) {
      console.error('Unexpected error during Supabase product deletion:', err);
      showToast(`Error deleting piece: ${err?.message || 'Unknown error'}`);
      return false;
    }
  };

  const exportOrdersCSV = async (targetOrders?: Order[]) => {
    const candidateOrders = (targetOrders && targetOrders.length > 0) ? targetOrders : orders;
    if (!candidateOrders || candidateOrders.length === 0) {
      showToast('No orders available to export');
      return;
    }

    try {
      const success = await exportOrdersToDelhiveryExcel(candidateOrders, products);
      if (success) {
        showToast(`Exported ${candidateOrders.length} orders to Delhivery Excel (.xlsx)`);
      } else {
        showToast('No shipment rows generated for export');
      }
    } catch (err: any) {
      console.error('Error generating Delhivery Excel manifest:', err);
      showToast(`Export failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const exportProductsCSV = () => {
    if (!products || products.length === 0) {
      showToast('No products available to export');
      return;
    }

    const headers = ['SKU ID', 'Product ID', 'Name', 'Slug', 'Category', 'Price (INR)', 'Material', 'Color', 'In Stock', 'Inventory', 'Rating'];
    const rows = products.map(p => [
      `"${p.sku || p.skuId || ''}"`,
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.slug}"`,
      `"${p.category}"`,
      p.price,
      `"${p.material.replace(/"/g, '""')}"`,
      `"${p.colorName.replace(/"/g, '""')}"`,
      p.inStock ? 'Yes' : 'No',
      p.stockQuantity || 50,
      p.rating,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stunning_birds_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Catalog exported to CSV successfully');
  };

  // Wishlist: Persist in Supabase wishlist_items and profiles
  const toggleWishlist = async (productId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      openAuthModal(
        'login',
        () => toggleWishlist(productId),
        'Please sign in to save pieces to your admired list'
      );
      showToast('Please sign in to save pieces to your admired list');
      return;
    }

    const userId = session.user.id;
    const inWishlist = userProfile.wishlistProductIds.includes(productId);
    const updated = inWishlist
      ? userProfile.wishlistProductIds.filter(id => id !== productId)
      : [...userProfile.wishlistProductIds, productId];

    setUserProfile(prev => ({ ...prev, wishlistProductIds: updated }));
    showToast(inWishlist ? 'Removed from your admired pieces' : 'Saved to your admired pieces');

    try {
      if (inWishlist) {
        await supabase.from('wishlist_items').delete().eq('user_id', userId).eq('product_id', productId);
      } else {
        await supabase.from('wishlist_items').upsert(
          { user_id: userId, product_id: productId },
          { onConflict: 'user_id,product_id' }
        );
      }
      await supabase.from('profiles').update({ wishlist_product_ids: updated }).eq('id', userId);
    } catch (e) {
      console.warn('Wishlist sync error:', e);
    }
  };

  // Reviews: Persist in Supabase product_reviews
  const addProductReview = async (
    productId: string,
    reviewData: { rating: number; title: string; comment: string }
  ): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      openAuthModal('login', undefined, 'Please sign in to your patron account to submit a review');
      showToast('Please sign in to submit your review');
      return false;
    }

    const newReview: ProductReview = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      authorName: userProfile.name || 'Patron of the Atelier',
      authorEmail: userProfile.email,
      authorAvatar: userProfile.avatarInitials || 'PA',
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      verifiedPurchase: true,
    };

    try {
      await supabase.from('product_reviews').insert({
        id: newReview.id,
        product_id: productId,
        user_id: session.user.id,
        author_name: newReview.authorName,
        author_email: newReview.authorEmail,
        author_avatar: newReview.authorAvatar,
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment,
        date: newReview.date,
        verified_purchase: true,
      });
    } catch {}

    setProducts(prevProducts => {
      return prevProducts.map(p => {
        if (p.id === productId || p.slug === productId) {
          const currentReviews = p.reviews || [];
          const updatedReviews = [newReview, ...currentReviews];
          const newCount = (p.reviewsCount || 0) + 1;
          const currentRating = p.rating || 5;
          const newAvg = Number(((currentRating * (p.reviewsCount || 1) + reviewData.rating) / newCount).toFixed(1));

          const updatedProd: Product = {
            ...p,
            rating: Math.min(5, Math.max(1, newAvg)),
            reviewsCount: newCount,
            reviews: updatedReviews,
          };

          if (selectedProduct.id === p.id || selectedProduct.slug === p.slug) {
            setSelectedProduct(updatedProd);
          }

          return updatedProd;
        }
        return p;
      });
    });

    showToast('Thank you. Your patron review has been recorded in Supabase.');
    return true;
  };

  const getProductVariants = useCallback((product: Product): Product[] => {
    if (!product) return [];
    const currentId = product.id;
    const currentGroup = product.variantGroup?.trim().toLowerCase();
    const currentLinked = product.linkedVariantIds || [];

    const matched = products.filter(p => {
      if (p.id === currentId) return true;
      if (currentLinked.includes(p.id)) return true;
      if (p.linkedVariantIds && p.linkedVariantIds.includes(currentId)) return true;
      if (currentGroup && p.variantGroup && p.variantGroup.trim().toLowerCase() === currentGroup) return true;
      return false;
    });

    if (!matched.some(p => p.id === currentId)) {
      matched.unshift(product);
    }

    const map = new Map<string, Product>();
    matched.forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  }, [products]);

  const contextValue = useMemo(() => ({
    currentScreen,
    setCurrentScreen,
    products,
    selectedProduct,
    setSelectedProduct,
    openProductBySlug,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    isSearchOpen,
    setIsSearchOpen,
    orders,
    latestPlacedOrder,
    placeOrder,
    createVerifiedOrder,
    createPendingOrder: createVerifiedOrder as any,
    confirmOrderPayment: async () => null,
    markOrderPaymentFailed: async () => {},
    updateOrderStatus,
    bulkUpdateOrderStatus,
    updateOrderShippingLabel,
    regenerateShippingLabel,
    addNewProduct,
    updateProduct,
    deleteProduct,
    deleteOrder,
    cancelCustomerOrder,
    markOrderAsRefunded,
    exportOrdersCSV,
    exportProductsCSV,
    refetchOrders,
    userProfile,
    toggleWishlist,
    addProductReview,
    adminMetrics,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedColorFilter,
    setSelectedColorFilter,
    toastMessage,
    showToast,
    isPageLoading,
    pageLoadingLabel,
    triggerPageLoad,
    setPageLoading,
    isLoggedIn,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    authPromptMessage,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    getProductVariants,
  }), [
    currentScreen,
    products,
    selectedProduct,
    cart,
    cartCount,
    cartTotal,
    isCartOpen,
    isSearchOpen,
    orders,
    latestPlacedOrder,
    userProfile,
    adminMetrics,
    selectedCategoryFilter,
    selectedColorFilter,
    toastMessage,
    isPageLoading,
    pageLoadingLabel,
    isLoggedIn,
    isAuthModalOpen,
    authModalMode,
    authPromptMessage,
    openProductBySlug,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    placeOrder,
    createVerifiedOrder,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    updateOrderShippingLabel,
    regenerateShippingLabel,
    addNewProduct,
    updateProduct,
    deleteProduct,
    deleteOrder,
    cancelCustomerOrder,
    markOrderAsRefunded,
    exportOrdersCSV,
    exportProductsCSV,
    refetchOrders,
    toggleWishlist,
    addProductReview,
    showToast,
    triggerPageLoad,
    setPageLoading,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    getProductVariants,
  ]);

  return (
    <ShopContext.Provider value={contextValue}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
