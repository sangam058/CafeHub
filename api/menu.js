import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { category } = req.query;
      let query = supabase.from('menu_items').select('*').order('category').order('name');
      if (category && category !== 'All') query = query.eq('category', category);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    // Auth check for mutations
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: session } = await supabase.from('auth_sessions').select('user_id').eq('id', token).gt('expires_at', new Date().toISOString()).single();
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const { data: user } = await supabase.from('users').select('role').eq('id', session.user_id).single();
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    if (req.method === 'POST') {
      const { name, description, category, price, image_url } = req.body;
      if (!name || !category || !price) return res.status(400).json({ error: 'Name, category, price required' });
      const { data, error } = await supabase.from('menu_items').insert({ name, description, category, price: parseFloat(price), image_url, available: true }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, description, category, price, image_url, available } = req.body;
      if (!id) return res.status(400).json({ error: 'ID required' });
      const { data, error } = await supabase.from('menu_items').update({ name, description, category, price: parseFloat(price), image_url, available }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID required' });
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Menu API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
