import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import MenuCard from '../components/MenuCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  available: boolean;
}

const CATEGORIES = ['All', 'Coffee', 'Snacks', 'Dessert'];

export default function Menu() {
  const { user } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'Coffee', price: '', image_url: '', available: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      let query = supabase.from('menu_items').select('*').order('category').order('name');
      if (category !== 'All') {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [category]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', description: '', category: 'Coffee', price: '', image_url: '', available: true });
    setMsg('');
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || '', category: item.category, price: String(item.price), image_url: item.image_url || '', available: item.available });
    setMsg('');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const payload = { 
        name: form.name, 
        description: form.description, 
        category: form.category, 
        price: parseFloat(form.price), 
        image_url: form.image_url, 
        available: form.available 
      };

      let error;
      if (editItem) {
        ({ error } = await supabase.from('menu_items').update(payload).eq('id', editItem.id));
      } else {
        ({ error } = await supabase.from('menu_items').insert(payload));
      }

      if (error) throw error;

      setMsg('Saved successfully!');
      fetchItems();
      setTimeout(() => { setShowForm(false); setMsg(''); }, 1200);
    } catch (err: any) {
      setMsg(err.message || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0600] pt-20">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-amber-100">Our Menu</h1>
            <p className="text-amber-400/60 mt-1">Crafted with love and finest ingredients</p>
          </div>
          {user?.role === 'admin' && (
            <button onClick={openAdd} className="px-5 py-2.5 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors">
              + Add Item
            </button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search menu..."
              className="w-full bg-[#2a1500] border border-amber-900/40 rounded-xl pl-10 pr-4 py-3 text-amber-100 placeholder-amber-700 focus:outline-none focus:border-amber-500/60"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  category === c ? 'bg-amber-500 text-[#1a0a00]' : 'bg-[#2a1500] border border-amber-900/40 text-amber-300 hover:border-amber-500/40'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(item => (
              <MenuCard
                key={item.id}
                item={item}
                isAdmin={user?.role === 'admin'}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-20 text-amber-400/40">No items found</div>
            )}
          </motion.div>
        )}
      </div>

      {/* Admin Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#2a1500] border border-amber-900/40 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-amber-300 mb-5">{editItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {[{ label: 'Name', key: 'name', type: 'text' }, { label: 'Price (₹)', key: 'price', type: 'number' }, { label: 'Image URL', key: 'image_url', type: 'url' }].map(f => (
                <div key={f.key}>
                  <label className="text-sm text-amber-400 mb-1 block">{f.label}</label>
                  <input
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.key !== 'image_url'}
                    className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-2.5 text-amber-100 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm text-amber-400 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-2.5 text-amber-100 focus:outline-none focus:border-amber-500/60 resize-none" />
              </div>
              <div>
                <label className="text-sm text-amber-400 mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-2.5 text-amber-100 focus:outline-none focus:border-amber-500/60">
                  {['Coffee', 'Snacks', 'Dessert'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.available} onChange={e => setForm(p => ({ ...p, available: e.target.checked }))} id="avail" className="accent-amber-500" />
                <label htmlFor="avail" className="text-sm text-amber-400">Available</label>
              </div>
              {msg && <p className={`text-sm ${msg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-amber-900/40 text-amber-400 rounded-xl hover:bg-amber-500/10 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
