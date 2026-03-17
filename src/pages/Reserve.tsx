import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Phone, Mail, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

export default function Reserve() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    date: '',
    time: '',
    guests: '2'
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        user_id: user?.id || null,
        guests: parseInt(form.guests),
        status: 'pending'
      };
      
      const { error: err } = await supabase.from('reservations').insert(payload);
      
      if (err) throw err;
      
      setSuccess(true);
    } catch (err: any) { 
      setError(err.message || 'Booking failed'); 
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0600] pt-20 flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center p-10 bg-[#2a1500] border border-amber-900/30 rounded-3xl max-w-md mx-4">
          <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-amber-100 mb-2">Reservation Confirmed!</h2>
          <p className="text-amber-400/70 mb-2">We've reserved a table for <strong className="text-amber-300">{form.guests} guests</strong></p>
          <p className="text-amber-400/70 mb-6">on <strong className="text-amber-300">{form.date}</strong> at <strong className="text-amber-300">{form.time}</strong></p>
          <p className="text-sm text-amber-600">A confirmation will be sent to {form.email}</p>
          <button onClick={() => { setSuccess(false); setForm({ name: user?.name || '', email: user?.email || '', phone: '', date: '', time: '', guests: '2' }); }}
            className="mt-6 px-6 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl hover:bg-amber-500/30 transition-colors">
            Make Another Reservation
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0600] pt-20">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-amber-100 mb-2">Reserve a Table</h1>
            <p className="text-amber-400/60">Book your perfect spot at CafeHub</p>
          </div>

          <div className="bg-[#2a1500] border border-amber-900/30 rounded-3xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm text-amber-400 mb-1.5 block flex items-center gap-1.5"><User size={14} /> Full Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-800 focus:outline-none focus:border-amber-500/60" />
                </div>
                <div>
                  <label className="text-sm text-amber-400 mb-1.5 block flex items-center gap-1.5"><Mail size={14} /> Email</label>
                  <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-800 focus:outline-none focus:border-amber-500/60" />
                </div>
              </div>

              <div>
                <label className="text-sm text-amber-400 mb-1.5 block flex items-center gap-1.5"><Phone size={14} /> Phone Number</label>
                <input type="tel" required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-800 focus:outline-none focus:border-amber-500/60" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm text-amber-400 mb-1.5 block flex items-center gap-1.5"><Calendar size={14} /> Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60" />
                </div>
                <div>
                  <label className="text-sm text-amber-400 mb-1.5 block flex items-center gap-1.5"><Clock size={14} /> Time</label>
                  <select required value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60">
                    <option value="">Select time</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-amber-400 mb-1.5 block flex items-center gap-1.5"><Users size={14} /> Number of Guests</label>
                <select value={form.guests} onChange={e => setForm(p => ({ ...p, guests: e.target.value }))}
                  className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 focus:outline-none focus:border-amber-500/60">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
                </select>
              </div>

              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-amber-500 text-[#1a0a00] font-black rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60 text-lg">
                {submitting ? 'Booking...' : 'Confirm Reservation'}
              </button>
            </form>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            {[{ label: 'Instant Confirmation', icon: '✓' }, { label: 'No Deposit Required', icon: '₹' }, { label: 'Easy Cancellation', icon: '↩' }].map((f, i) => (
              <div key={i} className="bg-[#2a1500] border border-amber-900/30 rounded-xl p-3">
                <div className="text-amber-400 text-xl mb-1">{f.icon}</div>
                <p className="text-amber-400/60 text-xs">{f.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
