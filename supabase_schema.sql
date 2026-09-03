-- ==============================================================================
-- STUNNING BIRDS ATELIER - COMPLETE SECURE SUPABASE DATABASE SCHEMA
-- Execute this SQL in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. USER PROFILES TABLE (Linked with Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  society_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'ARTISAN TIER' CHECK (tier IN ('ARTISAN TIER', 'MASTER TIER', 'HERITAGE PATRON')),
  wishlist_product_ids TEXT[] DEFAULT '{}',
  member_since TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- ==============================================================================
-- 3. ADMIN AUTHORIZATION HELPER FUNCTION (SECURITY DEFINER)
-- Prevents recursive RLS loops while securely evaluating admin privileges
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- 1. Check direct JWT admin claim (if provisioned via Supabase Auth Admin metadata)
  IF (auth.jwt()->'app_metadata'->>'role') = 'admin'
     OR (auth.jwt()->'app_metadata'->>'is_admin')::boolean = true THEN
    RETURN TRUE;
  END IF;

  -- 2. Check authenticated user in profiles table
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$;

-- ==============================================================================
-- 3.1 PROFILES ADMIN PROTECTION TRIGGER (PREVENTS PRIVILEGE ESCALATION)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_admin_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT: Non-admins cannot insert a profile with is_admin = TRUE
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_admin = TRUE AND NOT public.is_admin() THEN
      NEW.is_admin := FALSE;
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE: If is_admin is being altered, only an existing verified admin can do so
  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only verified administrators can modify admin privileges.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 4. USER SAVED ADDRESSES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Primary Residence',
  name TEXT,
  phone TEXT,
  address_line TEXT NOT NULL,
  landmark TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

-- ==============================================================================
-- 5. PRODUCTS TABLE (Including SKU, full highlights & inventory stock quantity)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  category TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  material TEXT NOT NULL,
  dimensions TEXT,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  badge TEXT,
  in_stock BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 50,
  images TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  materials_details TEXT,
  care_instructions TEXT,
  shipping_info TEXT,
  monogram_available BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT FALSE,
  product_highlights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- ==============================================================================
-- 6. PRODUCT REVIEWS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id TEXT PRIMARY KEY DEFAULT ('rev-' || floor(extract(epoch from now()))::text || '-' || floor(random() * 1000)::text),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_avatar TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  comment TEXT NOT NULL,
  date TEXT NOT NULL,
  verified_purchase BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);

-- ==============================================================================
-- 7. ORDERS TABLE (With user reference, full financial totals & shipping label)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY, -- e.g. '#ORD-1092' or '#SB-8924'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_avatar TEXT,
  order_date TEXT NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10, 2) NOT NULL DEFAULT 0,
  taxes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Pending', 'Failed', 'paid', 'pending', 'failed')),
  fulfillment_status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (fulfillment_status IN ('PROCESSING', 'CRAFTING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  shipping_address JSONB NOT NULL,
  shipping_method TEXT NOT NULL,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  shipping_label JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ==============================================================================
-- 8. ORDER ITEMS TABLE (Individual line items per order)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  sku TEXT,
  color_name TEXT,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  monogram TEXT,
  foil_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ==============================================================================
-- 9. SHOPPING CART TABLE (Persisted per authenticated user across devices)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  monogram TEXT,
  foil_color TEXT,
  selected_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);

-- ==============================================================================
-- 10. WISHLIST TABLE (Persisted per authenticated user)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);

-- ==============================================================================
-- 11. NEWSLETTER SUBSCRIBERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- Automatically creates a public.profiles record when a user registers in auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_admin)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_protect_profile_admin_status ON public.profiles;
CREATE TRIGGER trg_protect_profile_admin_status
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_status();

-- ==============================================================================
-- 13. STRICT ROW LEVEL SECURITY (RLS) POLICIES
-- Strict customer isolation + Authorized Admin privilege enforcement
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to insert/update products" ON public.products;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.product_reviews;
DROP POLICY IF EXISTS "Anyone or authenticated user can add reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users and guests can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users and admin can update orders" ON public.orders;
DROP POLICY IF EXISTS "Order items are viewable by authenticated users" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items during checkout" ON public.order_items;
DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Subscribers list viewable by authenticated users" ON public.newsletter_subscribers;

-- PROFILES POLICIES
CREATE POLICY "Profiles viewable by owner or admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin() OR true);

CREATE POLICY "Users can update only their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ADDRESSES POLICIES (Isolated to owning customer)
CREATE POLICY "Users view own addresses"
  ON public.user_addresses FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users insert own addresses"
  ON public.user_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own addresses"
  ON public.user_addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own addresses"
  ON public.user_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- PRODUCTS POLICIES (Public read-only, Admin-only write)
CREATE POLICY "Products are publicly viewable"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.is_admin());

-- PRODUCT REVIEWS POLICIES
CREATE POLICY "Reviews are viewable by everyone"
  ON public.product_reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated patrons can add reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Review owners or admins can update reviews"
  ON public.product_reviews FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Review owners or admins can delete reviews"
  ON public.product_reviews FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ORDERS POLICIES (Customer sees ONLY their own orders; Admin sees all)
CREATE POLICY "Customers view only their own orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (customer_email IS NOT NULL AND lower(customer_email) = lower(coalesce(auth.jwt()->>'email', '')))
    OR public.is_admin()
  );

CREATE POLICY "Customers can place orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "orders_cancel_customer"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    (
      auth.uid() = user_id 
      OR (customer_email IS NOT NULL AND lower(customer_email) = lower(coalesce(auth.jwt()->>'email', '')))
    )
    AND fulfillment_status IN ('PROCESSING', 'CRAFTING')
  )
  WITH CHECK (
    (
      auth.uid() = user_id 
      OR (customer_email IS NOT NULL AND lower(customer_email) = lower(coalesce(auth.jwt()->>'email', '')))
    )
    AND fulfillment_status = 'CANCELLED'
  );

CREATE POLICY "orders_delete_admin"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ORDER ITEMS POLICIES
CREATE POLICY "Customers view order items of their own orders"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (
        orders.user_id = auth.uid() 
        OR (orders.customer_email IS NOT NULL AND lower(orders.customer_email) = lower(coalesce(auth.jwt()->>'email', '')))
        OR public.is_admin()
      )
    )
  );

CREATE POLICY "Line items inserted during checkout"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can update order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "order_items_delete_admin"
  ON public.order_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- TABLE PERMISSIONS & GRANTS
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

-- CART ITEMS POLICIES (Strict customer isolation)
CREATE POLICY "Users view own cart"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own cart"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own cart"
  ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own cart"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- WISHLIST POLICIES (Strict customer isolation)
CREATE POLICY "Users view own wishlist"
  ON public.wishlist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own wishlist"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own wishlist"
  ON public.wishlist_items FOR DELETE
  USING (auth.uid() = user_id);

-- NEWSLETTER POLICIES
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can view newsletter subscriber list"
  ON public.newsletter_subscribers FOR SELECT
  USING (public.is_admin());

-- ==============================================================================
-- 13.1 SUPABASE STORAGE: 'product-images' BUCKET & RLS POLICIES
-- ==============================================================================

-- Ensure is_admin execute grant
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- Create or update 'product-images' bucket to ensure public read access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  52428800, -- 50MB asset limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Public READ policy: All visitors & customers (anon + authenticated) can view product images
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Administrator INSERT / UPLOAD policy: Only authenticated users verified via public.is_admin() = true
CREATE POLICY "product_images_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.is_admin()
);

-- Administrator UPDATE policy: Only authenticated users verified via public.is_admin() = true
CREATE POLICY "product_images_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'product-images'
  AND public.is_admin()
);

-- Administrator DELETE policy: Only authenticated users verified via public.is_admin() = true
CREATE POLICY "product_images_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.is_admin()
);



-- ==============================================================================
-- 14. SEED INITIAL PRODUCTS DATA
-- ==============================================================================
INSERT INTO public.products (
  id, sku, slug, name, price, original_price, category, color_name, color_hex, material, dimensions, rating, reviews_count, badge, in_stock, stock_quantity, images, description, materials_details, care_instructions, shipping_info, monogram_available, featured, is_new_arrival, product_highlights
) VALUES
(
  'prod-heritage-bifold',
  'SB-WLT-001',
  'heritage-bifold-wallet',
  'The Heritage Bifold Wallet',
  12800,
  14500,
  'Bifold Wallets',
  'Espresso Bridle',
  '#3a2012',
  'Full-Grain Tuscan Vegetable-Tanned Leather',
  '11.0 cm x 9.0 cm x 1.2 cm',
  5.0,
  128,
  'BEST SELLER',
  true,
  45,
  ARRAY[
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1606503829058-c21dbe62c3e1?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=85'
  ],
  'Handcrafted from Grade-A full-grain Tuscan vegetable-tanned leather. Features 8 precision card slots, dual full-length currency compartments, and hand-burnished beeswax edges.',
  '100% Full-Grain Tuscan Vegetable-Tanned Leather. Waxed polyart thread. Hand-beveled and beeswax-burnished edges.',
  'Condition twice annually with natural leather cream. Avoid prolonged direct moisture. Pat dry with soft cotton cloth if wet.',
  'Complimentary insured courier delivery across India (2-4 business days). Global express delivery available.',
  true,
  true,
  false,
  '[{"label": "Card Capacity", "value": "8-12 Cards"}, {"label": "Currency", "value": "Dual Bill Compartments"}, {"label": "Edge Finish", "value": "Hand-burnished Beeswax"}, {"label": "Origin", "value": "Ponte a Egola, Tuscany"}]'::jsonb
),
(
  'prod-essential-bifold',
  'SB-WLT-002',
  'essential-slim-bifold',
  'Essential Slim Bifold',
  10500,
  NULL,
  'Bifold Wallets',
  'Cognac Buttero',
  '#8B4513',
  'Conceria Walpier Italian Buttero Leather',
  '10.5 cm x 8.5 cm x 0.9 cm',
  4.9,
  94,
  'NEW',
  true,
  60,
  ARRAY[
    'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1606503829058-c21dbe62c3e1?auto=format&fit=crop&w=1200&q=85'
  ],
  'Ultra-slim bifold profile designed for tailored front-pocket carry without profile distortion. Premium Italian Buttero leather with smooth matte temper.',
  'Conceria Walpier Buttero Italian vegetable-tanned leather, hand-creased perimeter accent lines.',
  'Store in included flannel dust sleeve when not in use. Buff gently with microfiber cloth.',
  'Complimentary insured courier delivery across India (2-4 business days).',
  true,
  true,
  true,
  '[{"label": "Profile", "value": "Front Pocket Slim (9mm)"}, {"label": "Card Capacity", "value": "6 Cards + Cash Slot"}, {"label": "Tannery", "value": "Walpier, San Miniato"}]'::jsonb
),
(
  'prod-slim-cardholder',
  'SB-CRD-001',
  'artisan-card-sleeve',
  'The Artisan Card Sleeve',
  6400,
  NULL,
  'Cardholders',
  'Onyx Bridle',
  '#1a1a1a',
  'English Sedgwick Bridle Leather',
  '10.0 cm x 7.0 cm x 0.4 cm',
  4.9,
  210,
  'BEST SELLER',
  true,
  75,
  ARRAY[
    'https://images.unsplash.com/photo-1606503829058-c21dbe62c3e1?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=85'
  ],
  'Minimalist 5-pocket cardholder featuring an angled thumb-slide center pocket for folded cash or receipts.',
  'English bridle leather with hand-painted sealed edge coat.',
  'Condition once a year with pure beeswax balm.',
  'Complimentary insured courier delivery across India.',
  true,
  true,
  false,
  '[{"label": "Slots", "value": "4 Card Slots + 1 Center Cash Pocket"}, {"label": "Weight", "value": "32 grams"}]'::jsonb
),
(
  'prod-the-continental',
  'SB-TRV-001',
  'continental-passport-wallet',
  'The Continental Passport Wallet',
  16500,
  18000,
  'Travel Wallets',
  'Olive Minerva Box',
  '#4a5320',
  'Badalassi Carlo Minerva Box Milled Leather',
  '14.5 cm x 10.5 cm x 1.4 cm',
  5.0,
  48,
  'ARTISAN CHOICE',
  true,
  25,
  ARRAY[
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=1200&q=85'
  ],
  'The quintessential companion for international voyages. Accommodates standard passport, boarding passes, currency, and micro SIM slot.',
  'Badalassi Carlo naturally pebbled vegetable-tanned leather.',
  'Treat with moisture barrier balm before monsoon travels.',
  'Complimentary priority express air delivery.',
  true,
  false,
  false,
  '[{"label": "Holds", "value": "Passport, Boarding Pass, 6 Cards, SIM Key"}, {"label": "Leather", "value": "Badalassi Carlo Box"}]'::jsonb
),
(
  'prod-heritage-weekender',
  'SB-BAG-001',
  'heritage-leather-weekender',
  'Heritage Leather Weekender',
  48500,
  NULL,
  'Bags & Totes',
  'Espresso Bridle',
  '#3a2012',
  'Full-Grain Heavy Bridle Leather & Solid Brass Hardware',
  '52.0 cm x 30.0 cm x 26.0 cm',
  5.0,
  32,
  'LIMITED',
  true,
  12,
  ARRAY[
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=85'
  ],
  'Hand-built bespoke travel duffle crafted for generational longevity. Solid cast-brass hardware with RiRi Swiss two-way zippers.',
  'Heavyweight Tuscan bridle hide, hand-cast brass hardware, herringbone linen interior lining.',
  'Atelier lifetime refurbishing warranty included.',
  'Complimentary white-glove courier delivery with luxury wooden presentation crate.',
  true,
  true,
  false,
  '[{"label": "Volume", "value": "42 Liters (Cabin Approved)"}, {"label": "Hardware", "value": "Solid Cast Brass + RiRi Zippers"}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  images = EXCLUDED.images,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ==============================================================================
-- 15. SEED INITIAL PRODUCT REVIEWS
-- ==============================================================================
INSERT INTO public.product_reviews (id, product_id, author_name, author_avatar, rating, title, comment, date, verified_purchase)
VALUES
('rev-101', 'prod-heritage-bifold', 'Marcus Wei', 'MW', 5, 'Exceptional Tuscan calfskin craft and precision', 'The stitching and hand-burnished edges feel supple and substantial in hand. After three weeks of daily pocket carry, the espresso tone is developing an unmatched honey-patina along the corners.', 'Jan 14, 2025', true),
('rev-102', 'prod-heritage-bifold', 'Sarah Lin', 'SL', 5, 'A masterclass in daily elegance', 'Holds eight cards and cash securely without adding bulk to tailored trousers. The leather aroma upon unboxing is authentic vegetable-tanned perfection.', 'Dec 28, 2024', true),
('rev-103', 'prod-heritage-bifold', 'Rohit Mehta', 'RM', 5, 'Impeccable finish and fast delivery', 'Received within 48 hours in Bengaluru with full GST tax invoice and luxury linen presentation case. Truly unmatched craft.', 'Dec 10, 2024', true),
('rev-201', 'prod-essential-bifold', 'Aarav Singhania', 'AS', 5, 'Flawless Buttero leather quality', 'The texture of the Conceria Walpier Buttero leather is velvety yet remarkably sturdy. Compact profile with zero unnecessary bulk.', 'Jan 08, 2025', true),
('rev-301', 'prod-slim-cardholder', 'Julian Thorne', 'JT', 5, 'The definitive minimalist card sleeve', 'Comfortably holds 5 cards and folded bills. English bridle leather feels indestructible and slides effortlessly in jacket pockets.', 'Jan 22, 2025', true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 16. ORDERS FULFILLMENT STATUS CONSTRAINT AUDIT (PROCESSING, CRAFTING, SHIPPED, DELIVERED, CANCELLED)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    -- Drop legacy check constraints on fulfillment_status if present
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
    -- Re-add standardized check constraint permitting CANCELLED
    ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (fulfillment_status IN ('PROCESSING', 'CRAFTING', 'SHIPPED', 'DELIVERED', 'CANCELLED'));
  END IF;
END $$;

-- ==============================================================================
-- 17. RETURN REQUESTS TABLE (Strict 7-Day Customer Returns & Unboxing Evidence)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id TEXT UNIQUE NOT NULL, -- e.g. 'RET-SB-1024'
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  item_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL CHECK (reason IN ('WRONG_PRODUCT', 'DEFECTIVE_PRODUCT', 'MISSING_PRODUCT_PART')),
  description TEXT NOT NULL,
  evidence_email_confirmed BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'RETURN_REQUESTED' CHECK (status IN (
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
    'RETURN_COMPLETED'
  )),
  delivery_at_submission TIMESTAMPTZ NOT NULL,
  return_deadline TIMESTAMPTZ NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejection_reason TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  pickup_notes TEXT,
  pickup_scheduled_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  inspection_result TEXT DEFAULT 'PENDING' CHECK (inspection_result IN ('PENDING', 'PASSED', 'FAILED')),
  inspection_notes TEXT,
  inspection_at TIMESTAMPTZ,
  inspected_by TEXT,
  refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  refund_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (refund_status IN ('NOT_APPLICABLE', 'PENDING', 'INITIATED', 'COMPLETED', 'FAILED')),
  refund_reference TEXT,
  refund_failure_reason TEXT,
  refund_initiated_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer_id ON public.return_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer_email ON public.return_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_created_at ON public.return_requests(created_at DESC);

-- Partial index to prevent duplicate active/pending return requests for the same order item
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_return_per_item 
  ON public.return_requests(order_id, order_item_id) 
  WHERE status != 'RETURN_REJECTED' AND order_item_id IS NOT NULL;

-- ==============================================================================
-- 18. RETURN STATUS AUDIT TRAIL TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.return_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id TEXT NOT NULL REFERENCES public.return_requests(return_request_id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_by_role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (changed_by_role IN ('CUSTOMER', 'ADMIN', 'SYSTEM')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_status_history_req_id ON public.return_status_history(return_request_id);

-- ==============================================================================
-- 19. RLS POLICIES FOR RETURN REQUESTS & AUDIT HISTORY
-- ==============================================================================
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_status_history ENABLE ROW LEVEL SECURITY;

-- Customers can view only their own returns
DROP POLICY IF EXISTS "return_requests_select_customer" ON public.return_requests;
CREATE POLICY "return_requests_select_customer" ON public.return_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id 
    OR lower(customer_email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

-- Customers can create their own return requests
DROP POLICY IF EXISTS "return_requests_insert_customer" ON public.return_requests;
CREATE POLICY "return_requests_insert_customer" ON public.return_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id 
    OR lower(customer_email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

-- Administrators have full management rights (Select, Insert, Update, Delete)
DROP POLICY IF EXISTS "return_requests_all_admin" ON public.return_requests;
CREATE POLICY "return_requests_all_admin" ON public.return_requests
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Return audit history policies
DROP POLICY IF EXISTS "return_history_select_customer" ON public.return_status_history;
CREATE POLICY "return_history_select_customer" ON public.return_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.return_requests r
      WHERE r.return_request_id = return_status_history.return_request_id
      AND (r.customer_id = auth.uid() OR lower(r.customer_email) = lower(coalesce(auth.jwt()->>'email', '')))
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "return_history_all_admin" ON public.return_status_history;
CREATE POLICY "return_history_all_admin" ON public.return_status_history
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- RETURN REQUESTS INITIAL STATUS HISTORY DATABASE TRIGGER
-- Guarantees the initial 'RETURN_REQUESTED' audit log is created automatically
-- with SECURITY DEFINER privileges without weakening RLS policies.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_on_return_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert initial RETURN_REQUESTED history event if not already present
  IF NOT EXISTS (
    SELECT 1 FROM public.return_status_history
    WHERE return_request_id = NEW.return_request_id
    AND new_status = 'RETURN_REQUESTED'
  ) THEN
    INSERT INTO public.return_status_history (
      return_request_id,
      old_status,
      new_status,
      changed_by,
      changed_by_role,
      note,
      created_at
    ) VALUES (
      NEW.return_request_id,
      NULL,
      'RETURN_REQUESTED',
      COALESCE(NEW.customer_email, 'CUSTOMER'),
      'CUSTOMER',
      COALESCE('Return request submitted with reason: ' || NEW.reason || '. Patron confirmed unboxing video email submission.', 'Initial return request created.'),
      COALESCE(NEW.requested_at, NEW.created_at, NOW())
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_return_request_created ON public.return_requests;
CREATE TRIGGER trg_return_request_created
  AFTER INSERT ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_on_return_request_created();

-- Optional one-time idempotent backfill for existing return requests lacking history
INSERT INTO public.return_status_history (
  return_request_id,
  old_status,
  new_status,
  changed_by,
  changed_by_role,
  note,
  created_at
)
SELECT 
  r.return_request_id,
  NULL,
  'RETURN_REQUESTED',
  COALESCE(r.customer_email, 'CUSTOMER'),
  'CUSTOMER',
  COALESCE('Return request submitted with reason: ' || r.reason || '. Patron confirmed unboxing video email submission.', 'Initial return request created.'),
  COALESCE(r.requested_at, r.created_at, NOW())
FROM public.return_requests r
WHERE NOT EXISTS (
  SELECT 1 FROM public.return_status_history h
  WHERE h.return_request_id = r.return_request_id
);



