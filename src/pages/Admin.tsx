import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Users, ShoppingBag, Calendar, Star, TrendingUp, Edit3, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Admin() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPoints, setEditPoints] = useState<{ userId: number; points: number } | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') { navigate('/'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const [statsRes, usersRes, ordersRes, resRes, revRes] = await Promise.all([
      fetch('/api/admin?type=stats', { headers }),
      fetch('/api/admin?type=users', { headers }),
      fetch('/api/orders', { headers }),
      fetch('/api/reservations', { headers }),
      fetch('/api/reviews', { headers })
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (ordersRes.ok) setOrders(await ordersRes.json());
    if (resRes.ok) setReservations(await resRes.json());
    if (revRes.ok) setReviews(await revRes.json());
    setLoading(false);
  };

  const updateReservationStatus = async (id: number, status: string) => {
    await fetch('/api/reservations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status })
    });
    fetchAll();
  };

  const deleteReview = async (id: number) => {
    if (!confirm('Delete this review?')) return;
    await fetch('/api/reviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    fetchAll();
  };

  const updatePoints = async () => {
    if (!editPoints) return;
    await fetch('/api/loyalty', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: editPoints.userId, points: editPoints.points })
    });
    setEditPoints(null);
    fetchAll();
  };

  const tabs = [
    { id: 'stats', label: 'Analytics', icon: BarChart3 },
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

        {tab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {orders.map(order => {
              const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
              return (
                <div key={order.id} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-amber-100 font-bold">Order #{order.id} · {order.user_name}</p>
                      <p className="text-amber-600 text-xs">{order.user_email} · {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-black">₹{parseFloat(order.total_amount).toFixed(0)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>{order.status}</span>
                    </div>
                  </div>
                  <div className="text-sm text-amber-400/60">
                    {items?.map((i: any) => `${i.name} ×${i.quantity}`).join(', ')}
                  </div>
                  {order.payment_id && <p className="text-xs text-amber-700 mt-1">Payment: {order.payment_id}</p>}
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
                      <p className="text-amber-100 font-bold">{r.user_name}</p>
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
      </div>
    </div>
  );
}
