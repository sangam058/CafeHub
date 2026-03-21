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
      const { data, error } = await supabase
        .from('cart')
        .select(`
          id,
          quantity,
          menu_item_id,
          menu_items (
            id,
            name,
            description,
            price,
            image_url,
            category
          )
        `)
        .eq('user_id', authUser.id);
      
      if (error) {
        console.error('Supabase cart error:', error);
        throw error;
      }
      
      // 2. Map data carefully (Handle cases where menu_items might be returned as an array or object)
      const formattedData = (data || []).map((item: any) => {
        const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
        return {
          ...item,
          menu_items: menuItem || {
            id: item.menu_item_id,
            name: 'Unknown Item',
            price: 0,
            image_url: '',
            category: 'Uncategorized',
            description: ''
          }
        };
      });

      console.log("Final formatted cart:", formattedData);
      setCart(formattedData as CartItem[]);
    } catch (err) {
      console.error('Fetch cart failed:', err);
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
