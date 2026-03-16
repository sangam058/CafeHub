import supabase from './_supabase.js';

async function getUser(token) {
  if (!token) return null;
  const { data: session } = await supabase.from('auth_sessions').select('user_id').eq('id', token).gt('expires_at', new Date().toISOString()).single();
  if (!session) return null;
  const { data: user } = await supabase.from('users').select('id, name, email, role, loyalty_points').eq('id', session.user_id).single();
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = await getUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (user.role !== 'admin') query = query.eq('user_id', user.id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { items, total_amount, discount_applied, points_redeemed, payment_id, razorpay_order_id } = req.body;
      if (!items || !total_amount) return res.status(400).json({ error: 'Items and total required' });

      const points_earned = Math.floor(total_amount / 100) * 5;
      const { data: order, error } = await supabase.from('orders').insert({
        user_id: user.id,
        user_email: user.email,
        user_name: user.name,
        items: JSON.stringify(items),
        total_amount,
        discount_applied: discount_applied || 0,
        points_earned,
        points_redeemed: points_redeemed || 0,
        status: 'paid',
        payment_id,
        razorpay_order_id
      }).select().single();
      if (error) throw error;

      // Update loyalty points
      const newPoints = user.loyalty_points + points_earned - (points_redeemed || 0);
      await supabase.from('users').update({ loyalty_points: Math.max(0, newPoints) }).eq('id', user.id);

      // Clear cart
      await supabase.from('cart_items').delete().eq('user_id', user.id);

      return res.status(201).json(order);
    }

    if (req.method === 'PUT' && user.role === 'admin') {
      const { id, status } = req.body;
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Orders error:', err);
    return res.status(500).json({ error: err.message });
  }
}
