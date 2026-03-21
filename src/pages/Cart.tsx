import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft, Tag, CreditCard, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../supabase';


export default function Cart() {
  const { cart, cartTotal, loading, updateQuantity, removeItem, clearCart } = useCart();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const pointsAvailable = user?.loyalty_points || 0;
  const maxRedeemable = Math.floor(pointsAvailable / 100) * 100;
  const discount = redeemPoints ? Math.floor(maxRedeemable / 100) * 50 : 0;
  const finalTotal = Math.max(1, cartTotal - discount);
  const pointsToRedeem = redeemPoints ? maxRedeemable : 0;
  const pointsToEarn = Math.floor(finalTotal / 100) * 5;

  const saveOrder = async (paymentId: string) => {
    try {
      // 1. Insert into orders header
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: finalTotal,
          status: 'completed',
          payment_status: 'paid',
          payment_id: paymentId,
          discount_applied: discount,
          points_earned: pointsToEarn,
          points_redeemed: pointsToRedeem
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert into order_items relational table
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.menu_items.id,
        quantity: item.quantity,
        price_at_time: item.menu_items.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return true;
    } catch (err) {
      console.error('Order save error:', err);
      return false;
    }
  };

  const handleCheckout = async () => {
    if (!user) { navigate('/login'); return; }
    if (cart.length === 0) return;
    setProcessing(true);
    setMsg('');

    try {
      // Demo mode: Simulate payment since API is legacy
      // Show a brief "processing" delay for realism
      await new Promise(r => setTimeout(r, 1200));
      
      const paymentId = 'pay_demo_' + Date.now();
      
      const ok = await saveOrder(paymentId);
      if (ok) {
        // Increment loyalty points for the user
        const newPoints = (user.loyalty_points || 0) - pointsToRedeem + pointsToEarn;
        await supabase.from('users').update({ loyalty_points: newPoints }).eq('id', user.id);
        
        await clearCart();
        await refreshUser();
        setPaymentSuccess(true);
      } else {
        setMsg('Order save failed. Please ensure database tables are setup.');
      }
    } catch (err: any) {
      setMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="pt-20"><LoadingSpinner /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f0600] pt-32 text-center px-4">
        <ShoppingCart size={64} className="text-amber-900 mx-auto mb-4 opacity-20" />
        <h2 className="text-2xl font-bold text-amber-100 mb-2">Please log in</h2>
        <p className="text-amber-400/60 mb-8 max-w-xs mx-auto">You need to be logged in to view your shopping cart and place orders.</p>
        <Link to="/login" className="px-8 py-3 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors inline-block">
          Go to Login
        </Link>
      </div>
    );
  }

  // Payment success screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#0f0600] pt-20 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-10 bg-[#2a1500] border border-green-500/30 rounded-3xl max-w-md mx-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle size={72} className="text-green-400 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-3xl font-black text-amber-100 mb-2">Payment Successful!</h2>
          <p className="text-amber-400/70 mb-1">Your order has been placed.</p>
          <p className="text-green-400 font-semibold mb-6">+{pointsToEarn} loyalty points earned! 🎉</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard?tab=orders&success=1')}
              className="px-6 py-3 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors"
            >
              View Orders
            </button>
            <Link to="/menu" className="px-6 py-3 border border-amber-500/40 text-amber-300 rounded-xl hover:bg-amber-500/10 transition-colors">
              Order More
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0600] pt-20">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/menu" className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-black text-amber-100">Your Cart</h1>
          {cart.length > 0 && (
            <span className="bg-amber-500/20 text-amber-400 text-sm px-2 py-0.5 rounded-full">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart size={64} className="text-amber-900 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-amber-400/60 mb-4">Your cart is empty</h2>
            <Link to="/menu" className="px-6 py-3 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {cart.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-4 flex gap-4"
                  >
                    <img
                      src={item.menu_items?.image_url || ''}
                      alt={item.menu_items?.name}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-amber-100">{item.menu_items?.name}</h3>
                      <p className="text-amber-500 text-sm">{item.menu_items?.category}</p>
                      <p className="text-amber-400 font-bold mt-1">₹{item.menu_items?.price}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center hover:bg-amber-500/30 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-amber-100 font-semibold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center hover:bg-amber-500/30 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-amber-300 font-bold text-sm">
                        ₹{((item.menu_items?.price || 0) * item.quantity).toFixed(0)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button
                onClick={() => clearCart()}
                className="text-sm text-red-400/50 hover:text-red-400 transition-colors"
              >
                Clear entire cart
              </button>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <div className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-6 sticky top-24">
                <h2 className="text-lg font-bold text-amber-300 mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-amber-200/70">
                    <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                    <span>₹{cartTotal}</span>
                  </div>

                  {/* Loyalty Points Redemption */}
                  {pointsAvailable >= 100 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={redeemPoints}
                          onChange={e => setRedeemPoints(e.target.checked)}
                          className="accent-amber-500 mt-0.5"
                        />
                        <div>
                          <p className="text-amber-300 font-semibold flex items-center gap-1">
                            <Tag size={13} /> Redeem Loyalty Points
                          </p>
                          <p className="text-amber-500 text-xs mt-0.5">
                            Use {maxRedeemable} pts → get ₹{Math.floor(maxRedeemable / 100) * 50} off
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {discount > 0 && (
                    <div className="flex justify-between text-green-400 font-medium">
                      <span>Points Discount</span>
                      <span>−₹{discount}</span>
                    </div>
                  )}

                  <div className="border-t border-amber-900/30 pt-3 flex justify-between text-amber-100 font-bold text-base">
                    <span>Total</span>
                    <span>₹{finalTotal}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-400 text-xs">
                    🎯 You'll earn <span className="font-bold text-amber-300">{pointsToEarn} loyalty points</span> on this order
                  </p>
                </div>

                {msg && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-xs">{msg}</p>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={processing || cart.length === 0}
                  className="mt-4 w-full py-4 bg-amber-500 text-[#1a0a00] font-black rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60 text-base flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <><span className="animate-spin">⏳</span> Processing...</>
                  ) : (
                    <><CreditCard size={20} /> Pay ₹{finalTotal}</>
                  )}
                </button>
                <p className="text-xs text-amber-700 text-center mt-2">
                  🔒 Secured by Razorpay · UPI · Cards · NetBanking · Wallets
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
