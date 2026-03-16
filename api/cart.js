import supabase from './_supabase.js';

async function getUser(token) {
  if (!token) return null;
  const { data: session } = await supabase
    .from('auth_sessions')
    .select('user_id')
    .eq('id', token)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (!session) return null;
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, role, loyalty_points')
    .eq('id', session.user_id)
    .single();
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = await getUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      // Fetch cart items + menu item details in two queries (avoids join issues)
      const { data: cartRows, error: cartErr } = await supabase
        .from('cart_items')
        .select('id, quantity, menu_item_id')
        .eq('user_id', user.id);
      if (cartErr) throw cartErr;
      if (!cartRows || cartRows.length === 0) return res.status(200).json([]);

      const menuIds = cartRows.map((r) => r.menu_item_id);
      const { data: menuRows, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, name, description, price, image_url, category')
        .in('id', menuIds);
      if (menuErr) throw menuErr;

      const menuMap = {};
      (menuRows || []).forEach((m) => { menuMap[m.id] = m; });

      const result = cartRows.map((c) => ({
        id: c.id,
        quantity: c.quantity,
        menu_item_id: c.menu_item_id,
        menu_items: menuMap[c.menu_item_id] || null,
      }));

      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { menu_item_id } = req.body;
      if (!menu_item_id) return res.status(400).json({ error: 'menu_item_id required' });

      // Check if item exists in menu
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('id, available')
        .eq('id', menu_item_id)
        .single();
      if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
      if (!menuItem.available) return res.status(400).json({ error: 'Item is not available' });

      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('menu_item_id', menu_item_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      const { data, error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, menu_item_id, quantity: 1 })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, quantity } = req.body;
      if (!id) return res.status(400).json({ error: 'ID required' });
      if (quantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
        return res.status(200).json({ ok: true, deleted: true });
      }
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (id) {
        await supabase.from('cart_items').delete().eq('id', id).eq('user_id', user.id);
      } else {
        await supabase.from('cart_items').delete().eq('user_id', user.id);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Cart error:', err);
    return res.status(500).json({ error: err.message });
  }
}
