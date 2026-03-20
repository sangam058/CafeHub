-- ============================================
-- CAFEHUB PROFESSIONAL SCHEMA V2
-- ============================================

-- CLEAN SLATE (Optional: run these if you want to wipe everything first)
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS reservations CASCADE;
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS menu_items CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS (Synced with Supabase Auth)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'customer', -- 'customer' or 'admin'
  loyalty_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 1b. CART (Added for persistence)
CREATE TABLE cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 2. MENU ITEMS
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL, -- 'Coffee', 'Snacks', 'Dessert'
  price numeric(10,2) NOT NULL,
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
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

-- 1. SEED MENU ITEMS
INSERT INTO menu_items (name, description, category, price, image_url) VALUES
('Espresso',        'Rich, bold single-shot espresso',              'Coffee',  120.00, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Cappuccino',      'Classic Italian cappuccino with foam',           'Coffee',  180.00, 'https://images.pexels.com/photos/350478/pexels-photo-350478.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Caramel Latte',   'Smooth latte with caramel drizzle',             'Coffee',  220.00, 'https://images.pexels.com/photos/1193335/pexels-photo-1193335.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Cold Brew',       'Slow-steeped cold brew coffee',                   'Coffee',  200.00, 'https://images.pexels.com/photos/4869332/pexels-photo-4869332.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Avocado Toast',   'Sourdough with smashed avocado',                'Snacks',  280.00, 'https://images.pexels.com/photos/1351238/pexels-photo-1351238.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Cheesecake',      'New York style cheesecake',                      'Dessert', 250.00, 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=400');

-- 2. NOTE ON ADMIN PRE-EXISTENCE
-- To make "Aman Singh" pre-exist as Admin:
-- First, create the user in Supabase Auth (Dashboard -> Auth -> Add User).
-- Use: aman@gmail.com / aman7045
-- Once created, our trigger will automatically add him to the 'users' table.
-- Then RUN THIS ONE COMMAND to make him Admin:
-- UPDATE public.users SET role = 'admin' WHERE email = 'aman@gmail.com';

-- ============================================
-- RLS POLICIES (Professional Standard)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view menu" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage menu" ON menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- (Policies for orders, reviews etc. would follow similar logic)
