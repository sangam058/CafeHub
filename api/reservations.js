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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { name, email, phone, date, time, guests } = req.body;
      if (!name || !email || !phone || !date || !time || !guests) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check double booking
      const { data: existing } = await supabase.from('reservations').select('id').eq('date', date).eq('time', time).neq('status', 'cancelled');
      if (existing && existing.length >= 3) {
        return res.status(409).json({ error: 'This time slot is fully booked. Please choose another time.' });
      }

      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId = null;
      if (token) {
        const user = await getUser(token);
        if (user) userId = user.id;
      }

      const { data, error } = await supabase.from('reservations').insert({
        user_id: userId, name, email, phone, date, time, guests: parseInt(guests), status: 'pending'
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      let query = supabase.from('reservations').select('*').order('date', { ascending: true }).order('time', { ascending: true });
      if (user.role !== 'admin') query = query.eq('user_id', user.id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT' && user.role === 'admin') {
      const { id, status } = req.body;
      const { data, error } = await supabase.from('reservations').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE' && user.role === 'admin') {
      const { id } = req.body;
      const { error } = await supabase.from('reservations').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Reservations error:', err);
    return res.status(500).json({ error: err.message });
  }
}
