import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Users, ShoppingBag, Calendar, Star, TrendingUp, Edit3, Trash2, CheckCircle, XCircle, Coffee, Plus, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import LoadingSpinner from '../components/LoadingSpinner';

import { supabase } from '../supabase';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPoints, setEditPoints] = useState<{ userId: string; points: number } | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') { navigate('/'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        { data: usersData }, 
        { data: ordersData }, 
        { data: resData }, 
        { data: revData },
        { data: menuData }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('orders').select('*, users(name, email), order_items(*, menu_items(name))').order('created_at', { ascending: false }),
        supabase.from('reservations').select('*').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
        supabase.from('menu_items').select('*').order('category')
      ]);

      if (usersData) setUsers(usersData);
      if (ordersData) setOrders(ordersData);
      if (resData) setReservations(resData);
      if (revData) setReviews(revData);
      if (menuData) setMenuItems(menuData);

      // Calculate Stats
      if (ordersData && usersData && resData && revData) {
        const totalRevenue = ordersData.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        const paidOrders = ordersData.filter(o => o.payment_status === 'paid').length;
        const avgRating = revData.length > 0 
          ? (revData.reduce((sum, r) => sum + r.rating, 0) / revData.length).toFixed(1) 
          : 0;

        setStats({
          totalRevenue,
          totalOrders: ordersData.length,
          paidOrders,
          totalUsers: usersData.length,
          totalReservations: resData.length,
          totalReviews: revData.length,
          avgRating,
          totalPointsRedeemed: ordersData.reduce((sum, o) => sum + (o.points_redeemed || 0), 0)
        });
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
    }
    setLoading(false);
  };

  const updateReservationStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
    if (!error) fetchAll();
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (!error) fetchAll();
  };


  const updatePoints = async () => {
    if (!editPoints) return;
    const { error } = await supabase
      .from('users')
      .update({ loyalty_points: editPoints.points })
      .eq('id', editPoints.userId);
    
    if (!error) {
      setEditPoints(null);
      fetchAll();
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) fetchAll();
  };

  const updatePaymentStatus = async (id: string, payment_status: string) => {
    const { error } = await supabase.from('orders').update({ payment_status }).eq('id', id);
    if (!error) fetchAll();
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (!error) fetchAll();
  };

  const saveMenuItem = async (item: any) => {
    const { id, ...data } = item;
    if (id) {
      await supabase.from('menu_items').update(data).eq('id', id);
    } else {
      await supabase.from('menu_items').insert(data);
    }
    setShowItemModal(false);
    setEditingItem(null);
    fetchAll();
  };

  const tabs = [
    { id: 'stats', label: 'Analytics', icon: BarChart3 },
    { id: 'menu', label: 'Menu', icon: Coffee },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'reservations', label: 'Reservations', icon: Calendar },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  if (!user || user.role !== 'admin') return null;
  if (loading) return <div className="pt-20"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-[#0f0600] pt-20">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-amber-100">Admin Dashboard</h1>
          <p className="text-amber-400/60 mt-1">Manage your cafe operations</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-amber-500 text-[#1a0a00]' : 'bg-[#2a1500] border border-amber-900/30 text-amber-400 hover:border-amber-500/40'
              }`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'stats' && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: `₹${stats.totalRevenue?.toFixed(0)}`, icon: TrendingUp, color: 'text-green-400' },
                { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-amber-400' },
                { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
                { label: 'Reservations', value: stats.totalReservations, icon: Calendar, color: 'text-purple-400' },
              ].map((s, i) => (
                <div key={i} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon size={18} className={s.color} />
                    <span className="text-amber-400/60 text-xs">{s.label}</span>
                  </div>
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Paid Orders', value: stats.paidOrders },
                { label: 'Avg Rating', value: `${stats.avgRating} ★` },
                { label: 'Reviews', value: stats.totalReviews },
                { label: 'Points Redeemed', value: stats.totalPointsRedeemed },
              ].map((s, i) => (
                <div key={i} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5 text-center">
                  <div className="text-2xl font-black text-amber-400">{s.value}</div>
                  <div className="text-amber-400/60 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'menu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-amber-100">Manage Menu</h2>
              <button 
                onClick={() => { setEditingItem({ name: '', description: '', category: 'Coffee', price: 0, image_url: '', available: true }); setShowItemModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors"
              >
                <Plus size={18} /> Add Item
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => (
                <div key={item.id} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl overflow-hidden flex gap-4 p-3 group">
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="text-amber-100 font-bold truncate">{item.name}</h3>
                      <p className="text-amber-500 text-xs">{item.category} · ₹{item.price}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${item.available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {item.available ? 'Available' : 'Sold Out'}
                      </span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingItem(item); setShowItemModal(true); }} className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"><Edit3 size={14} /></button>
                      <button onClick={() => deleteMenuItem(item.id)} className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {orders.map(order => {
              return (
                <div key={order.id} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-amber-100 font-bold">Order #{order.id.slice(0,8)} · {order.users?.name || 'Customer'}</p>
                      <p className="text-amber-600 text-xs">{order.users?.email} · {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-black">₹{parseFloat(order.total_amount).toFixed(0)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>{order.status} ({order.payment_status})</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-amber-400/80">
                    {order.order_items?.map((item: any, i: number) => (
                      <p key={i}>{item.menu_items?.name} ×{item.quantity}</p>
                    ))}
                  </div>
                  {order.discount_applied > 0 && <p className="text-xs text-green-500 mt-2">Discount: -₹{parseFloat(order.discount_applied).toFixed(0)} ({order.points_redeemed} pts)</p>}
                  {order.payment_id && <p className="text-xs text-amber-700 mt-1">Payment: {order.payment_id}</p>}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-amber-900/20">
                    <p className="text-xs text-amber-500 font-semibold mr-2">Update Status:</p>
                    <button onClick={() => updateOrderStatus(order.id, 'processing')} className="px-3 py-1 text-[10px] font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors">Processing</button>
                    <button onClick={() => updateOrderStatus(order.id, 'completed')} className="px-3 py-1 text-[10px] font-bold rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors">Complete</button>
                    <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-3 py-1 text-[10px] font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">Cancel</button>
                    <div className="ml-auto flex items-center gap-2">
                       <p className="text-xs text-amber-500 font-semibold mr-2">Payment:</p>
                       <button onClick={() => updatePaymentStatus(order.id, 'paid')} className="px-3 py-1 text-[10px] font-bold rounded-lg bg-green-500 text-[#1a0a00] hover:bg-green-400 transition-colors">Mark Paid</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === 'reservations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {reservations.map(r => (
              <div key={r.id} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-amber-100 font-bold">{r.name}</p>
                    <p className="text-amber-400/60 text-sm">{r.date} at {r.time} · {r.guests} guests</p>
                    <p className="text-amber-600 text-xs">{r.email} · {r.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      r.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      r.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{r.status}</span>
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => updateReservationStatus(r.id, 'confirmed')}
                          className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"><CheckCircle size={18} /></button>
                        <button onClick={() => updateReservationStatus(r.id, 'cancelled')}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><XCircle size={18} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {editPoints && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditPoints(null)}>
                <div className="bg-[#2a1500] border border-amber-900/40 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-amber-300 mb-4">Adjust Loyalty Points</h3>
                  <input type="number" value={editPoints.points} onChange={e => setEditPoints(p => p ? { ...p, points: parseInt(e.target.value) } : null)}
                    className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60 mb-4" />
                  <div className="flex gap-3">
                    <button onClick={() => setEditPoints(null)} className="flex-1 py-2.5 border border-amber-900/40 text-amber-400 rounded-xl">Cancel</button>
                    <button onClick={updatePoints} className="flex-1 py-2.5 bg-amber-500 text-[#1a0a00] font-bold rounded-xl">Save</button>
                  </div>
                </div>
              </div>
            )}
            {users.map(u => (
              <div key={u.id} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-amber-100 font-bold">{u.name}</p>
                  <p className="text-amber-400/60 text-sm">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{u.role}</span>
                    <span className="text-xs text-amber-600">★ {u.loyalty_points} pts</span>
                  </div>
                </div>
                <button onClick={() => setEditPoints({ userId: u.id, points: u.loyalty_points })}
                  className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors">
                  <Edit3 size={16} />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'reviews' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <p className="text-amber-100 font-bold">{r.full_name}</p>
                       <StarRating rating={r.rating} size={14} />
                     </div>
                    <p className="text-amber-200/70 text-sm">{r.comment}</p>
                    <p className="text-amber-600 text-xs mt-2">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => deleteReview(r.id)} className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-3">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Item Modal */}
        {showItemModal && editingItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1a0a00] border border-amber-500/20 rounded-3xl p-6 w-full max-w-xl my-8">
              <h2 className="text-2xl font-black text-amber-100 mb-6">{editingItem.id ? 'Edit Item' : 'Add New Item'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-amber-500 font-bold uppercase mb-1.5 ml-1">Name</label>
                    <input type="text" value={editingItem.name} 
                      onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="w-full bg-[#2a1500] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-amber-500 font-bold uppercase mb-1.5 ml-1">Category</label>
                    <select value={editingItem.category} 
                      onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full bg-[#2a1500] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60">
                      <option value="Coffee">Coffee</option>
                      <option value="Snacks">Snacks</option>
                      <option value="Dessert">Dessert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-amber-500 font-bold uppercase mb-1.5 ml-1">Price (₹)</label>
                    <input type="number" value={editingItem.price} 
                      onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                      className="w-full bg-[#2a1500] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-amber-500 font-bold uppercase mb-1.5 ml-1">Image URL</label>
                    <input type="text" value={editingItem.image_url} 
                      onChange={e => setEditingItem({ ...editingItem, image_url: e.target.value })}
                      className="w-full bg-[#2a1500] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-amber-500 font-bold uppercase mb-1.5 ml-1">Description</label>
                    <textarea value={editingItem.description} rows={3}
                      onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="w-full bg-[#2a1500] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60 text-sm resize-none"></textarea>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input type="checkbox" checked={editingItem.available} id="avail"
                      onChange={e => setEditingItem({ ...editingItem, available: e.target.checked })}
                      className="w-5 h-5 accent-amber-500" />
                    <label htmlFor="avail" className="text-amber-100 font-semibold select-none">Available for Order</label>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-8 pt-6 border-t border-amber-900/20">
                <button onClick={() => setShowItemModal(false)}
                  className="flex-1 py-3 text-amber-400 font-bold hover:bg-amber-500/5 rounded-xl transition-colors">Cancel</button>
                <button onClick={() => saveMenuItem(editingItem)}
                  className="flex-1 py-3 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                  <Save size={20} /> Save Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
