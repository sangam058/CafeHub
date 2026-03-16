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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = await getUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ points: user.loyalty_points, discount_value: Math.floor(user.loyalty_points / 100) * 50 });
    }

    if (req.method === 'PUT') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const { user_id, points } = req.body;
      const { data, error } = await supabase.from('users').update({ loyalty_points: points }).eq('id', user_id).select('id, name, email, loyalty_points').single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
