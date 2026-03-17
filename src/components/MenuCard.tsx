import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  id: string; // Changed to string for UUID
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  available: boolean;
}

interface MenuCardProps {
  item: MenuItem;
  onEdit?: (item: MenuItem) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export default function MenuCard({ item, onEdit, onDelete, isAdmin }: MenuCardProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'loading' | 'added'>('idle');

  const handleAddToCart = async () => {
    if (!user) {
      showToast('Please login to add items to cart', 'info');
      navigate('/login');
      return;
    }
    if (status !== 'idle') return;
    setStatus('loading');
    try {
      await addToCart(item.id);
      setStatus('added');
      showToast(`${item.name} added to cart! 🛒`, 'success');
      setTimeout(() => setStatus('idle'), 1800);
    } catch (err: any) {
      showToast(err.message || 'Failed to add to cart', 'error');
      setStatus('idle');
    }
  };

  const categoryColors: Record<string, string> = {
    Coffee: 'bg-amber-900/40 text-amber-300',
    Snacks: 'bg-green-900/40 text-green-300',
    Dessert: 'bg-pink-900/40 text-pink-300',
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="bg-[#2a1500] border border-amber-900/30 rounded-2xl overflow-hidden group"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.image_url || 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400'}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a1500]/80 to-transparent" />
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full ${categoryColors[item.category] || 'bg-amber-900/40 text-amber-300'}`}>
          {item.category}
        </span>
        {!item.available && (
          <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full bg-red-900/60 text-red-300">
            Unavailable
          </span>
        )}

        {/* Added to cart overlay flash */}
        <AnimatePresence>
          {status === 'added' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-green-900/60 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Check size={28} className="text-white" />
                </motion.div>
                <span className="text-white font-bold text-sm bg-black/40 px-3 py-1 rounded-full">Added!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-amber-100 text-lg leading-tight">{item.name}</h3>
        <p className="text-amber-400/60 text-sm mt-1 line-clamp-2">{item.description}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xl font-bold text-amber-400">₹{item.price}</span>
          {isAdmin ? (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(item)}
                className="px-3 py-1.5 bg-amber-500/20 text-amber-300 text-sm rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete?.(item.id)}
                className="px-3 py-1.5 bg-red-500/20 text-red-300 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          ) : (
            <motion.button
              onClick={handleAddToCart}
              disabled={!item.available || status === 'loading'}
              whileTap={{ scale: 0.92 }}
              className={`flex items-center gap-1.5 px-4 py-2 font-semibold text-sm rounded-lg transition-all duration-300
                ${!item.available
                  ? 'opacity-40 cursor-not-allowed bg-gray-700 text-gray-400'
                  : status === 'added'
                  ? 'bg-green-500 text-white cursor-default'
                  : status === 'loading'
                  ? 'bg-amber-400/70 text-[#1a0a00] cursor-wait'
                  : 'bg-amber-500 text-[#1a0a00] hover:bg-amber-400 active:bg-amber-600'
                }`}
            >
              {status === 'loading' ? (
                <><Loader2 size={15} className="animate-spin" /> Adding...</>
              ) : status === 'added' ? (
                <><Check size={15} /> Added!</>
              ) : (
                <><Plus size={15} /> Add to Cart</>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
