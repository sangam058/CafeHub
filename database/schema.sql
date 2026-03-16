-- ============================================
-- CafeHub Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text DEFAULT 'user',
  loyalty_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. AUTH SESSIONS TABLE
CREATE TABLE IF NOT EXISTS auth_sessions (
  id text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS menu_items (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price numeric NOT NULL,
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  user_email text,
  user_name text,
  items jsonb NOT NULL,
  total_amount numeric NOT NULL,
  discount_applied numeric DEFAULT 0,
  points_earned integer DEFAULT 0,
  points_redeemed integer DEFAULT 0,
  status text DEFAULT 'pending',
  payment_id text,
  razorpay_order_id text,
  created_at timestamptz DEFAULT now()
);

-- 5. RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS reservations (
  id serial PRIMARY KEY,
  user_id integer,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  guests integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 6. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  user_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS cart_items (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  menu_item_id integer NOT NULL,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SEED MENU ITEMS
-- ============================================
INSERT INTO menu_items (name, description, category, price, image_url, available) VALUES
('Espresso',        'Rich, bold single-shot espresso with a perfect crema layer',              'Coffee',  120, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400',  true),
('Cappuccino',      'Classic Italian cappuccino with steamed milk foam and espresso',           'Coffee',  180, 'https://images.pexels.com/photos/350478/pexels-photo-350478.jpeg?auto=compress&cs=tinysrgb&w=400',  true),
('Caramel Latte',   'Smooth latte with caramel drizzle and whipped cream topping',             'Coffee',  220, 'https://images.pexels.com/photos/1193335/pexels-photo-1193335.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('Cold Brew',       'Slow-steeped cold brew coffee, smooth and less acidic',                   'Coffee',  200, 'https://images.pexels.com/photos/4869332/pexels-photo-4869332.jpeg?auto=compress&cs=tinysrgb&w=400',  true),
('Mocha',           'Espresso with chocolate syrup, steamed milk and whipped cream',           'Coffee',  240, 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',   true),
('Avocado Toast',   'Toasted sourdough with smashed avocado, cherry tomatoes and feta',        'Snacks',  280, 'https://images.pexels.com/photos/1351238/pexels-photo-1351238.jpeg?auto=compress&cs=tinysrgb&w=400',  true),
('Cheese Sandwich', 'Grilled cheese sandwich with herbs on artisan bread',                     'Snacks',  180, 'https://images.pexels.com/photos/1647163/pexels-photo-1647163.jpeg?auto=compress&cs=tinysrgb&w=400',  true),
('Bruschetta',      'Toasted baguette with tomato, basil and olive oil',                       'Snacks',  220, 'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=400',  true),
('Chocolate Brownie','Warm fudgy brownie with vanilla ice cream and chocolate sauce',          'Dessert', 200, 'https://images.pexels.com/photos/45202/brownie-dessert-cake-sweet-45202.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('Cheesecake',      'New York style cheesecake with berry compote',                            'Dessert', 250, 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=400',  true),
('Tiramisu',        'Classic Italian dessert with mascarpone, espresso and cocoa',             'Dessert', 280, 'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=400',  true),
('Pancakes',        'Fluffy buttermilk pancakes with maple syrup and fresh berries',           'Snacks',  260, 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400',   true);

-- ============================================
-- SEED ADMIN USER
-- password = aman362004 (PBKDF2 hashed)
-- ============================================
INSERT INTO users (name, email, password_hash, role, loyalty_points) VALUES (
  'Aman Singh',
  'aman@gmail.com',
  '0def7e68b161e8cd25e6cfd4e8d0c89891cb5e96f20e02a629f1f7dfb58ca208:0c4644289258b6592f35d5f206bce07f9f4f1daaa125c184ef38e6b9ebf587071a43721a5f6b3829d8d46b5c382505c76b5a284c5061369f8948b8484799072d',
  'admin',
  0
);
