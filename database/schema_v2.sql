-- ============================================
-- CAFEHUB PROFESSIONAL SCHEMA V2
-- ============================================

-- CLEAN SLATE (Optional: run these if you want to wipe everything first)
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS (Synced with Supabase Auth)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'customer', -- 'customer' or 'admin'
  loyalty_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 1a. MENU_ITEMS
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL, -- 'Coffee', 'Snacks', 'Dessert'
  price numeric NOT NULL,
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 1b. CART (Relational integrity for joins)
CREATE TABLE cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, menu_item_id)
);

-- 3. ORDERS
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  total_amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
  payment_status text DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  payment_id text,
  discount_applied numeric(10,2) DEFAULT 0,
  points_earned integer DEFAULT 0,
  points_redeemed integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. ORDER ITEMS (Relational setup)
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price_at_time numeric(10,2) NOT NULL
);

-- 5. RESERVATIONS
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  guests integer NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
  created_at timestamptz DEFAULT now()
);

-- 6. REVIEWS
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- AUTH SYNC TRIGGER
-- This automatically creates a record in the 'users' table 
-- when someone signs up on the website.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Customer'), 
    new.email, 
    'customer'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear previous trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- INITIAL SEED DATA
-- ============================================

-- 1. SEED MENU ITEMS (Ensuring a professional base set)
-- We use UPSERT (ON CONFLICT) so we don't delete items the user added manually
INSERT INTO menu_items (id, name, description, category, price, image_url, available) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Espresso',        'Rich, bold single-shot espresso',              'Coffee',  120.00, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440002', 'Cappuccino',      'Classic Italian cappuccino with foam',           'Coffee',  180.00, 'https://images.pexels.com/photos/350478/pexels-photo-350478.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440003', 'Caramel Latte',   'Smooth latte with caramel drizzle',             'Coffee',  220.00, 'https://images.pexels.com/photos/1193335/pexels-photo-1193335.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440004', 'Cold Brew',       'Slow-steeped cold brew coffee',                   'Coffee',  200.00, 'https://images.pexels.com/photos/4869332/pexels-photo-4869332.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440005', 'Avocado Toast',   'Sourdough with smashed avocado',                'Snacks',  280.00, 'https://images.pexels.com/photos/1351238/pexels-photo-1351238.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440006', 'Cheesecake',      'New York style cheesecake',                      'Dessert', 250.00, 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440007', 'Mocha',           'Rich chocolate and espresso blend',             'Coffee',  210.00, 'https://images.pexels.com/photos/1235706/pexels-photo-1235706.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440008', 'Paneer Wrap',     'Spicy paneer with fresh veggies',              'Snacks',  190.00, 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440009', 'Brownie',         'Gooey chocolate brownie with walnuts',          'Dessert', 150.00, 'https://images.pexels.com/photos/45202/brownies-dessert-cake-sweet-45202.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('550e8400-e29b-41d4-a716-446655440010', 'Flat White',      'Silky smooth micro-foam over espresso',          'Coffee',  190.00, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400', true)
ON CONFLICT (id) DO UPDATE SET 
  available = EXCLUDED.available,
  price = EXCLUDED.price,
  description = EXCLUDED.description;

-- 2. NOTE ON ADMIN PRE-EXISTENCE
-- To make "Aman Singh" pre-exist as Admin:
-- First, create the user in Supabase Auth (Dashboard -> Auth -> Add User).
-- Use: aman@gmail.com / aman7045
-- Once created, our trigger will automatically add him to the 'users' table.
-- Then RUN THIS ONE COMMAND to make him Admin:
-- UPDATE public.users SET role = 'admin' WHERE email = 'aman@gmail.com';

-- ============================================
-- 7. PERFORMANCE & CONSTRAINTS
-- ============================================

-- Prevent duplicate menu items in the same user's cart
-- This allows us to use 'upsert' or 'insert on conflict' effectively
ALTER TABLE cart ADD CONSTRAINT unique_user_menu_item UNIQUE (user_id, menu_item_id);

-- Add index for faster cart and order lookups
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- ============================================
-- 8. DATA SYNC & MAINTENANCE
-- ============================================

-- Sync any existing auth users who might be missing from public.users
INSERT INTO public.users (id, name, email, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Customer'),
  email, 
  'customer'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Ensure Aman is Admin
UPDATE public.users SET role = 'admin' WHERE email = 'aman@gmail.com';

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Function to check if current user is admin (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin')
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- USERS: Users can see and edit their own profile. Admins see all.
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to users" ON users FOR ALL USING (is_admin());

-- MENU ITEMS: Everyone can view. Only Admins can modify.
CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage menu items" ON menu_items FOR ALL USING (is_admin());

-- CART: Users can manage their own cart.
DROP POLICY IF EXISTS "Users can manage own cart" ON cart;
CREATE POLICY "Users can manage own cart"
ON cart
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ORDERS: Users can see own orders. Admins can see/update all.
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL USING (is_admin());

-- ORDER ITEMS: Users can see items of their own orders. Admins can manage all.
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert order items" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage order items" ON order_items FOR ALL USING (is_admin());

-- RESERVATIONS: Users manage own. Admins manage all.
CREATE POLICY "Users can manage own reservations" ON reservations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reservations" ON reservations FOR ALL USING (is_admin());

-- REVIEWS: Anyone can view. Users can create own. Admins can moderate.
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can moderate reviews" ON reviews FOR ALL USING (is_admin());

