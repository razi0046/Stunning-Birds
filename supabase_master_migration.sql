-- ==============================================================================
-- HARDENED & IDEMPOTENT SUPABASE MIGRATION
-- ==============================================================================

-- 1. ADMIN HELPER FUNCTION (SECURITY DEFINER avoids RLS recursion & permission traps)
-- Strictly checks database verified profiles.is_admin or trusted Supabase auth app_metadata
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

-- 1.1 PROFILES ADMIN PROTECTION TRIGGER (PREVENTS PRIVILEGE ESCALATION)
-- Non-admin authenticated users CANNOT insert or update is_admin to TRUE
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP TRIGGER IF EXISTS trg_protect_profile_admin_status ON public.profiles;
    CREATE TRIGGER trg_protect_profile_admin_status
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_admin_status();
  END IF;
END $$;

-- 2. SAFE COLUMN ADDITIONS (Only if missing in existing table schemas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'newsletter_subscribers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'newsletter_subscribers' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.newsletter_subscribers ADD COLUMN user_id UUID;
    END IF;
  END IF;

  -- Safe column additions for razorpay fields in orders table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'razorpay_order_id'
    ) THEN
      ALTER TABLE public.orders ADD COLUMN razorpay_order_id TEXT;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'razorpay_payment_id'
    ) THEN
      ALTER TABLE public.orders ADD COLUMN razorpay_payment_id TEXT;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'razorpay_signature'
    ) THEN
      ALTER TABLE public.orders ADD COLUMN razorpay_signature TEXT;
    END IF;
  END IF;
END $$;

-- 3. SAFE FOREIGN KEY VERIFICATION & CREATION (By Column & Target)
DO $$
BEGIN
  -- profiles(id) -> auth.users(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'profiles' AND kcu.column_name = 'id'
    ) THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- user_addresses(user_id) -> auth.users(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_addresses' AND column_name = 'user_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'user_addresses' AND kcu.column_name = 'user_id'
    ) THEN
      ALTER TABLE public.user_addresses ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- cart_items(user_id) -> auth.users(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'user_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'cart_items' AND kcu.column_name = 'user_id'
    ) THEN
      ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- cart_items(product_id) -> products(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'cart_items' AND kcu.column_name = 'product_id'
    ) THEN
      ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- wishlist_items(user_id) -> auth.users(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlist_items' AND column_name = 'user_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'wishlist_items' AND kcu.column_name = 'user_id'
    ) THEN
      ALTER TABLE public.wishlist_items ADD CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- wishlist_items(product_id) -> products(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlist_items' AND column_name = 'product_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'wishlist_items' AND kcu.column_name = 'product_id'
    ) THEN
      ALTER TABLE public.wishlist_items ADD CONSTRAINT wishlist_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- product_reviews(user_id) -> auth.users(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_reviews' AND column_name = 'user_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'product_reviews' AND kcu.column_name = 'user_id'
    ) THEN
      ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- product_reviews(product_id) -> products(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_reviews' AND column_name = 'product_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'product_reviews' AND kcu.column_name = 'product_id'
    ) THEN
      ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- orders(user_id) -> auth.users(id) (or drop and recreate if mistakenly pointing to profiles)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id') THEN
    -- Check if existing constraint points to profiles instead of auth.users
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'orders' AND ccu.table_name = 'profiles'
    ) THEN
      ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'orders' AND kcu.column_name = 'user_id'
    ) THEN
      ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- order_items(order_id) -> orders(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'order_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'order_items' AND kcu.column_name = 'order_id'
    ) THEN
      ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- order_items(product_id) -> products(id) (ensure nullable & ON DELETE SET NULL)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_id') THEN
    -- Ensure column is nullable so historic orders aren't blocked from product deletion
    BEGIN
      ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Drop old restrictive FK constraint if exists
    ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

    -- Re-add with ON DELETE SET NULL
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;

  -- newsletter_subscribers(user_id) -> auth.users(id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'newsletter_subscribers' AND column_name = 'user_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = 'newsletter_subscribers' AND kcu.column_name = 'user_id'
    ) THEN
      ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 4. UNIQUE COMPOSITE INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_user_prod ON public.cart_items(user_id, product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_user_prod ON public.wishlist_items(user_id, product_id);

-- 5. MINIMAL & PURPOSE-SPECIFIC TABLE PERMISSIONS (NO UNRESTRICTED ANON ACCESS)
-- Public tables
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;

-- Authenticated customer tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT INSERT ON public.product_reviews TO authenticated;

-- Orders & order items (customers + server/admin service)
GRANT SELECT, INSERT ON public.orders TO authenticated, anon;
GRANT UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated, anon;
GRANT UPDATE, DELETE ON public.order_items TO authenticated;

-- Admin product writes
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 7. DROP PREVIOUS POLICIES SAFELY
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'products', 'user_addresses', 'cart_items', 'wishlist_items', 'product_reviews', 'orders', 'order_items', 'newsletter_subscribers')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 8. SECURE RLS POLICIES

-- PROFILES: Users access only their own; admins can inspect for orders
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- USER ADDRESSES: Strictly user-owned
CREATE POLICY "user_addresses_all_own" ON public.user_addresses
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- CART & WISHLIST: Strictly user-owned
CREATE POLICY "cart_items_all_own" ON public.cart_items
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlist_items_all_own" ON public.wishlist_items
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PRODUCTS: Publicly readable; admin manageable
CREATE POLICY "products_read_public" ON public.products
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "products_write_admin" ON public.products
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- PRODUCT REVIEWS: Publicly readable; authenticated write with ownership
CREATE POLICY "reviews_read_public" ON public.product_reviews
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "reviews_insert_authenticated" ON public.product_reviews
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ORDERS: Customers read their own; admin manages all
CREATE POLICY "orders_select_own_or_admin" ON public.orders
FOR SELECT TO anon, authenticated
USING (
  auth.uid() = user_id 
  OR (customer_email IS NOT NULL AND lower(customer_email) = lower(coalesce(auth.jwt()->>'email', '')))
  OR public.is_admin()
);

CREATE POLICY "orders_insert_checkout" ON public.orders
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "orders_update_admin" ON public.orders
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "orders_cancel_customer" ON public.orders
FOR UPDATE TO authenticated
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

CREATE POLICY "orders_delete_admin" ON public.orders
FOR DELETE TO authenticated
USING (public.is_admin());

-- ORDER ITEMS: Readable by order owner or admin; insertable during checkout
CREATE POLICY "order_items_select_own_or_admin" ON public.order_items
FOR SELECT TO anon, authenticated
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

CREATE POLICY "order_items_insert_checkout" ON public.order_items
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "order_items_delete_admin" ON public.order_items
FOR DELETE TO authenticated
USING (public.is_admin());

-- NEWSLETTER: Anyone can subscribe; admin can view
CREATE POLICY "newsletter_insert_public" ON public.newsletter_subscribers
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers
FOR SELECT TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 9. SUPABASE STORAGE: 'product-images' BUCKET & RLS POLICIES
-- ==============================================================================

-- 9.0 Ensure is_admin execute grant
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 9.1 Create or update 'product-images' bucket to ensure public read access
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

-- 9.2 Safely remove previous storage policies on storage.objects for product-images
DO $$
BEGIN
  DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
  DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
  DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
END $$;

-- 9.3 Public READ policy: All visitors & customers (anon + authenticated) can view product images
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- 9.4 Administrator INSERT / UPLOAD policy: Only authenticated users verified via public.is_admin() = true
CREATE POLICY "product_images_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.is_admin()
);

-- 9.5 Administrator UPDATE policy: Only authenticated users verified via public.is_admin() = true
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

-- 9.6 Administrator DELETE policy: Only authenticated users verified via public.is_admin() = true
CREATE POLICY "product_images_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.is_admin()
);

-- 10. ORDERS FULFILLMENT STATUS CONSTRAINT AUDIT (PROCESSING, CRAFTING, SHIPPED, DELIVERED, CANCELLED)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    -- Drop legacy check constraints on fulfillment_status if present
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
    -- Re-add standardized check constraint
    ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (fulfillment_status IN ('PROCESSING', 'CRAFTING', 'SHIPPED', 'DELIVERED', 'CANCELLED'));
  END IF;
END $$;

-- 11. RETURN REQUESTS TABLE (Strict 7-Day Customer Returns & Unboxing Evidence)
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_return_per_item 
  ON public.return_requests(order_id, order_item_id) 
  WHERE status != 'RETURN_REJECTED' AND order_item_id IS NOT NULL;

-- 12. RETURN STATUS AUDIT TRAIL TABLE
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

-- 13. RLS POLICIES FOR RETURN REQUESTS & AUDIT HISTORY
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "return_requests_select_customer" ON public.return_requests;
CREATE POLICY "return_requests_select_customer" ON public.return_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id 
    OR lower(customer_email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "return_requests_insert_customer" ON public.return_requests;
CREATE POLICY "return_requests_insert_customer" ON public.return_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id 
    OR lower(customer_email) = lower(coalesce(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "return_requests_all_admin" ON public.return_requests;
CREATE POLICY "return_requests_all_admin" ON public.return_requests
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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




