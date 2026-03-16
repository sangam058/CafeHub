import supabase from './_supabase.js';

async function getUser(token) {
  if (!token) return null;
  const { data: session } = await supabase.from('auth_sessions').select('user_id').eq('id', token).gt('expires_at', new Date().toISOString()).single();
  if (!session) return null;
  const { data: user } = await supabase.from('users').select('id, name, email, role').eq('id', session.user_id).single();
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = await getUser(token);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    if (req.method === 'GET') {
      const { type } = req.query;

      if (type === 'stats') {
        const [ordersRes, usersRes, reservationsRes, reviewsRes] = await Promise.all([
          supabase.from('orders').select('total_amount, status, points_redeemed'),
          supabase.from('users').select('id, loyalty_points'),
          supabase.from('reservations').select('id, status'),
          supabase.from('reviews').select('id, rating')
        ]);
        const orders = ordersRes.data || [];
        const paidOrders = orders.filter(o => o.status === 'paid');
        const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
        const totalPointsRedeemed = orders.reduce((sum, o) => sum + (o.points_redeemed || 0), 0);
        const avgRating = reviewsRes.data?.length ? (reviewsRes.data.reduce((s, r) => s + r.rating, 0) / reviewsRes.data.length).toFixed(1) : 0;
        return res.status(200).json({
          totalOrders: orders.length,
          paidOrders: paidOrders.length,
          totalRevenue,
          totalUsers: usersRes.data?.length || 0,
          totalReservations: reservationsRes.data?.length || 0,
          totalReviews: reviewsRes.data?.length || 0,
          totalPointsRedeemed,
          avgRating
        });
      }

      if (type === 'users') {
        const { data, error } = await supabase.from('users').select('id, name, email, role, loyalty_points, created_at').order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }

      return res.status(400).json({ error: 'Invalid type' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin error:', err);
    return res.status(500).json({ error: err.message });
  }
}
