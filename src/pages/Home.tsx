import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, ChevronRight, Clock, MapPin, Phone, Award, ShoppingCart, Calendar } from 'lucide-react';
import StarRating from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../supabase';
import { FALLBACK_MENU } from '../data/fallbackMenu';

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
}

export default function Home() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [featured, setFeatured] = useState<MenuItem[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);
        if (reviewsData) setReviews(reviewsData);

        const { data: menuData } = await supabase
          .from('menu_items')
          .select('*')
          .limit(4);

        if (menuData && menuData.length > 0) {
          setFeatured(menuData);
        } else {
          setFeatured(FALLBACK_MENU.slice(0, 4));
        }
      } catch (err) {
        console.error('Error fetching home data:', err);
      }
    };
    fetchData();
  }, []);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setReviewMsg('');
    try {
      const { error: err } = await supabase.from('reviews').insert({
        ...reviewForm,
        user_name: user?.name || 'Guest',
        user_id: user?.id
      });

      if (!err) {
        setReviewMsg('Review submitted! Thank you.');
        showToast('Review submitted successfully! ⭐', 'success');
        setReviewForm({ rating: 5, comment: '' });
        
        // Refresh reviews
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);
        if (reviewsData) setReviews(reviewsData);
      } else {
        setReviewMsg(err.message || 'Failed to submit');
        showToast(err.message || 'Failed to submit review', 'error');
      }
    } catch (err: any) {
      setReviewMsg('Something went wrong');
      showToast(err.message || 'Something went wrong', 'error');
    }
    setSubmitting(false);
  };

  const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-[#0f0600]">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.pexels.com/photos/1995842/pexels-photo-1995842.jpeg?auto=compress&cs=tinysrgb&w=1600" alt="Cafe" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0600]/60 via-[#0f0600]/40 to-[#0f0600]" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-4 py-2 mb-6">
            <Coffee size={16} className="text-amber-400" />
            <span className="text-amber-300 text-sm font-medium">Premium Cafe Experience</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
            className="text-6xl md:text-8xl font-black text-white mb-4 leading-none">
            Cafe<span className="text-amber-400">Hub</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
            className="text-xl text-amber-100/70 mb-10 max-w-2xl mx-auto">
            Where every sip tells a story. Artisanal coffee, handcrafted desserts, and a warm atmosphere that feels like home.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/menu" className="px-8 py-4 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
              <ShoppingCart size={20} /> Explore Menu
            </Link>
            <Link to="/reserve" className="px-8 py-4 border-2 border-amber-500/50 text-amber-300 font-bold rounded-xl hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-2">
              <Calendar size={20} /> Reserve a Table
            </Link>
          </motion.div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight size={24} className="text-amber-400 rotate-90" />
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#1a0a00]">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[{ label: 'Happy Customers', value: '10,000+' }, { label: 'Menu Items', value: '50+' }, { label: 'Years of Craft', value: '8+' }, { label: 'Avg Rating', value: '4.9 ★' }].map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center p-6 bg-amber-500/5 border border-amber-900/30 rounded-2xl">
              <div className="text-3xl font-black text-amber-400 mb-1">{s.value}</div>
              <div className="text-sm text-amber-200/60">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Menu */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-4xl font-black text-amber-100 mb-3">Featured Items</h2>
          <p className="text-amber-400/60">Handpicked favorites from our menu</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((item, i) => (
            <motion.div key={item.id} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-[#2a1500] border border-amber-900/30 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-colors">
              <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover" />
              <div className="p-4">
                <span className="text-xs text-amber-500 font-semibold">{item.category}</span>
                <h3 className="font-bold text-amber-100 mt-1">{item.name}</h3>
                <p className="text-amber-400/60 text-xs mt-1 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-amber-400 font-bold">₹{item.price}</span>
                  <Link to="/menu" className="text-xs text-amber-500 hover:text-amber-400">View →</Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/menu" className="inline-flex items-center gap-2 px-6 py-3 border border-amber-500/40 text-amber-400 rounded-xl hover:bg-amber-500/10 transition-colors">
            View Full Menu <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[#1a0a00]">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-4xl font-black text-amber-100 mb-3">Why CafeHub?</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Award, title: 'Loyalty Rewards', desc: 'Earn 5 points for every ₹100 spent. Redeem 100 points for ₹50 off your next order.' },
              { icon: Calendar, title: 'Easy Reservations', desc: 'Book your table in seconds. No waiting, no hassle — your perfect spot awaits.' },
              { icon: Coffee, title: 'Premium Quality', desc: 'Sourced from the finest estates. Every cup is crafted with precision and passion.' },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="p-8 bg-amber-500/5 border border-amber-900/30 rounded-2xl text-center hover:border-amber-500/30 transition-colors">
                <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <f.icon size={28} className="text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-amber-100 mb-2">{f.title}</h3>
                <p className="text-amber-400/60 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-4xl font-black text-amber-100 mb-3">What Guests Say</h2>
          <p className="text-amber-400/60">Real reviews from our community</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {reviews.map((r, i) => (
            <motion.div key={r.id} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-6">
              <StarRating rating={r.rating} />
              <p className="text-amber-200/80 text-sm mt-3 leading-relaxed italic">"{r.comment}"</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500/30 rounded-full flex items-center justify-center text-amber-400 font-bold text-sm">
                  {r.user_name[0]}
                </div>
                <div>
                  <p className="text-amber-300 text-sm font-semibold">{r.user_name}</p>
                  <p className="text-amber-600 text-xs">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Review form */}
        {user ? (
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="bg-[#2a1500] border border-amber-900/30 rounded-2xl p-8 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-amber-300 mb-6">Share Your Experience</h3>
            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="text-sm text-amber-400 mb-2 block">Your Rating</label>
                <StarRating rating={reviewForm.rating} interactive onChange={r => setReviewForm(p => ({ ...p, rating: r }))} size={28} />
              </div>
              <div>
                <label className="text-sm text-amber-400 mb-2 block">Your Review</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  rows={4}
                  placeholder="Tell us about your experience..."
                  className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-700 focus:outline-none focus:border-amber-500/60 resize-none"
                />
              </div>
              {reviewMsg && <p className={`text-sm ${reviewMsg.includes('Thank') ? 'text-green-400' : 'text-red-400'}`}>{reviewMsg}</p>}
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-amber-500 text-[#1a0a00] font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </motion.div>
        ) : (
          <div className="text-center">
            <p className="text-amber-400/60 mb-4">Have something to say?</p>
            <Link to="/login" className="px-6 py-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl hover:bg-amber-500/30 transition-colors">Login to Write a Review</Link>
          </div>
        )}
      </section>

      {/* Info */}
      <section className="py-16 bg-[#1a0a00]">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: MapPin, title: 'Find Us', lines: ['123 Brew Street', 'Koramangala, Bangalore', 'Karnataka 560034'] },
            { icon: Clock, title: 'Hours', lines: ['Mon–Fri: 7am – 10pm', 'Sat–Sun: 8am – 11pm', 'Holidays: 9am – 9pm'] },
            { icon: Phone, title: 'Contact', lines: ['+91 98765 43210', 'hello@cafehub.in', '@cafehub.in'] },
          ].map((info, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <info.icon size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-amber-300 mb-2">{info.title}</h3>
                {info.lines.map((l, j) => <p key={j} className="text-amber-400/60 text-sm">{l}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-amber-900/20 text-center">
        <p className="text-amber-600 text-sm">© 2025 CafeHub. All rights reserved. Crafted with ☕ & ❤️</p>
      </footer>
    </div>
  );
}
