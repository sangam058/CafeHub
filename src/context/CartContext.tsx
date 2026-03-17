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
    if (!user) { setCart([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart')
        .select('*, menu_items(*)')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setCart(data || []);
    } catch (err) {
      console.error('Cart fetch error:', err);
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchCart();
    else setCart([]);
  }, [user, fetchCart]);

  const addToCart = async (menuItemId: string) => {
    if (!user) return;
    
    // Check if item already exists
    const existing = cart.find(i => i.menu_item_id === menuItemId);
    if (existing) {
      await updateQuantity(existing.id, existing.quantity + 1);
      return;
    }

    const { error } = await supabase.from('cart').insert({
      user_id: user.id,
      menu_item_id: menuItemId,
      quantity: 1
    });

    if (error) throw error;
    await fetchCart();
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
