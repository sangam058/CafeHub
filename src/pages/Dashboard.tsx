import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Calendar, Award, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const fetchAll = async () => {
      setLoading(true);
      const [ordRes, resRes] = await Promise.all([
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/reservations', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (resRes.ok) setReservations(await resRes.json());
      setLoading(false);
    };
    fetchAll();
  }, [user, token]);

  const success = searchParams.get('success');
  const totalSpent = orders.filter(o => o.status === 'paid').reduce((s, o) => s + parseFloat(o.total_amount), 0);
  const pointsToNextReward = 100 - (user?.loyalty_points || 0) % 100;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Award },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'reservations', label: 'Reservations', icon: Calendar },
  ];

  if (!user) return null;
  if (loading) return <div className="pt-20"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-[#0f0600] pt-20">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 text-sm text-center">
            ✅ Order placed successfully! Your loyalty points have been updated.
          </motion.div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-amber-100">My Dashboard</h1>
            <p className="text-amber-400/60 mt-1">Welcome back, {user.name.split(' ')[0]}!</p>
          </div>
          <Link to="/menu" className="px-4 py-2 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors text-sm">Order Now</Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-[#2a1500] border border-amber-900/30 rounded-2xl p-1.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-amber-500 text-[#1a0a00]' : 'text-amber-400 hover:text-amber-300'
              }`}>
              <t.icon size={16} />
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Orders', value: orders.length, color: 'text-amber-400' },
                { label: 'Total Spent', value: `₹${totalSpent.toFixed(0)}`, color: 'text-green-400' },
                { label: 'Loyalty Points', value: user.loyalty_points, color: 'text-purple-400' },
                { label: 'Reservations', value: reservations.length, color: 'text-blue-400' },
              ].map((s, i) => (
                <div key={i} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-amber-400/60 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Loyalty Card */}
            <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-500/30 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-amber-300">Loyalty Rewards</h2>
                  <p className="text-amber-400/60 text-sm mt-1">Earn 5 pts per ₹100 spent</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-amber-400">{user.loyalty_points}</div>
                  <div className="text-amber-600 text-xs">points</div>
                </div>
              </div>
              <div className="bg-[#1a0a00]/60 rounded-full h-3 mb-2">
                <div className="bg-amber-500 h-3 rounded-full transition-all" style={{ width: `${((user.loyalty_points % 100) / 100) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs text-amber-600">
                <span>{user.loyalty_points % 100} pts</span>
                <span>{pointsToNextReward} pts to next reward</span>
                <span>100 pts</span>
              </div>
              {user.loyalty_points >= 100 && (
                <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                  <p className="text-amber-300 text-sm font-semibold">🎉 You can redeem {Math.floor(user.loyalty_points / 100) * 100} points for ₹{Math.floor(user.loyalty_points / 100) * 50} off!</p>
                  <p className="text-amber-500 text-xs mt-1">Apply at checkout when ordering</p>
                </div>
              )}
            </div>

            {/* Recent Orders */}
            {orders.slice(0, 3).length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-amber-300 mb-3">Recent Orders</h3>
                <div className="space-y-3">
                  {orders.slice(0, 3).map(order => (
                    <div key={order.id} className="bg-[#2a1500] border border-amber-900/30 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-amber-100 font-semibold text-sm">Order #{order.id}</p>
                        <p className="text-amber-600 text-xs">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 font-bold">₹{parseFloat(order.total_amount).toFixed(0)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>{order.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="text-amber-900 mx-auto mb-3" />
                <p className="text-amber-400/60">No orders yet. <Link to="/menu" className="text-amber-400 hover:underline">Browse menu</Link></p>
              </div>
            ) : orders.map(order => {
              const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
              return (
                <div key={order.id} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-amber-100 font-bold">Order #{order.id}</p>
                      <p className="text-amber-600 text-xs">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-black text-lg">₹{parseFloat(order.total_amount).toFixed(0)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>{order.status}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {items?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-amber-200/70">{item.name} ×{item.quantity}</span>
                        <span className="text-amber-400">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  {(order.discount_applied > 0 || order.points_earned > 0) && (
                    <div className="mt-3 pt-3 border-t border-amber-900/30 flex gap-4 text-xs">
                      {order.discount_applied > 0 && <span className="text-green-400">-₹{order.discount_applied} discount</span>}
                      {order.points_earned > 0 && <span className="text-amber-400">+{order.points_earned} pts earned</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === 'reservations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-amber-400/60 text-sm">{reservations.length} reservation(s)</p>
              <Link to="/reserve" className="px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm rounded-xl hover:bg-amber-500/30 transition-colors">+ New Reservation</Link>
            </div>
            {reservations.length === 0 ? (
              <div className="text-center py-16">
                <Calendar size={48} className="text-amber-900 mx-auto mb-3" />
                <p className="text-amber-400/60">No reservations yet. <Link to="/reserve" className="text-amber-400 hover:underline">Book a table</Link></p>
              </div>
            ) : reservations.map(r => (
              <div key={r.id} className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-bold">{r.date} at {r.time}</p>
                    <p className="text-amber-400/60 text-sm">{r.guests} guest(s) · {r.name}</p>
                    <p className="text-amber-600 text-xs">{r.email} · {r.phone}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    r.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                    r.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>{r.status}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
