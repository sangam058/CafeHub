import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase';

interface CartItem {
  id: string; // UUID
  quantity: number;
  menu_item_id: string; // UUID
  menu_items: {
    id: string; // UUID
    name: string;
    description: string;
    price: number;
    image_url: string;
    category: string;
  };
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (menuItemId: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    // 1. Get user directly from Supabase to ensure fresh session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.log("No auth user found in fetchCart");
      setCart([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("Fetching cart for UUID:", authUser.id);
    
    try {
      // 1. Fetch raw cart items for this user
      const { data: cartData, error: cartError } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', authUser.id);
      
      if (cartError) {
        console.error('Raw cart fetch error:', cartError);
        throw cartError;
      }

      if (!cartData || cartData.length === 0) {
        console.log("Database returned 0 items in cart for user:", authUser.id);
        setCart([]);
        setLoading(false);
        return;
      }

      console.log("Raw cart data from DB:", cartData);

      // 2. Fetch all menu items referenced in the cart to avoid join issues
      const itemIds = cartData.map(c => c.menu_item_id);
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .in('id', itemIds);

      if (menuError) {
        console.warn('Menu items fetch failed (join fallback):', menuError);
      }

      // 3. Fail-safe Join: Combine them in JavaScript
      const formattedData = cartData.map(item => {
        const menuItem = menuData?.find(m => m.id === item.menu_item_id);
        return {
          ...item,
          menu_items: menuItem || {
            id: item.menu_item_id,
            name: 'Item from Menu', // Fallback name
            price: 0,
            image_url: '',
            category: 'Category',
            description: 'Item details being synchronized...'
          }
        };
      });

      console.log("Final joined cart (JS-side join):", formattedData);
      setCart(formattedData as CartItem[]);
    } catch (err) {
      console.error('Cart fetch failed completely:', err);
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, []); // Remove user dependency, use direct getUser() instead

  // Automatically fetch on mount and when user state changes in context
  useEffect(() => {
    fetchCart();
  }, [fetchCart, user?.id]);

  const addToCart = async (menuItemId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      alert("Please login to add items to cart");
      return;
    }

    try {
      // 1. Double check database for existing item
      const { data: existing, error: fetchError } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('user_id', authUser.id)
        .eq('menu_item_id', menuItemId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        await supabase
          .from('cart')
          .update({ quantity: existing.quantity + 1, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart').insert({
          user_id: authUser.id,
          menu_item_id: menuItemId,
          quantity: 1
        });
      }

      await fetchCart();
    } catch (err) {
      console.error('Add to cart failed:', err);
      alert("Could not add item. Ensure database is setup correctly.");
      throw err;
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (!user) return;
    if (quantity <= 0) {
      await removeItem(id);
      return;
    }
    await supabase.from('cart').update({ quantity }).eq('id', id);
    await fetchCart();
  };

  const removeItem = async (id: string) => {
    if (!user) return;
    await supabase.from('cart').delete().eq('id', id);
    await fetchCart();
  };

  const clearCart = async () => {
    if (!user) return;
    await supabase.from('cart').delete().eq('user_id', user.id);
    setCart([]);
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + (i.menu_items?.price || 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, loading, fetchCart, addToCart, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
