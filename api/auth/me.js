import supabase from '../_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { data: session, error } = await supabase
      .from('auth_sessions')
      .select('user_id, expires_at')
      .eq('id', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) return res.status(401).json({ error: 'Invalid or expired session' });

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, loyalty_points')
      .eq('id', session.user_id)
      .single();

    if (userError || !user) return res.status(401).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
