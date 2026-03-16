import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0600] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
              <Coffee size={20} className="text-[#1a0a00]" />
            </div>
            <span className="text-2xl font-black text-amber-400">CafeHub</span>
          </Link>
          <h1 className="text-3xl font-black text-amber-100">Welcome back</h1>
          <p className="text-amber-400/60 mt-1">Sign in to your account</p>
        </div>

        <div className="bg-[#2a1500] border border-amber-900/30 rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-amber-400 mb-1.5 block">Email</label>
              <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="your@email.com"
                className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-800 focus:outline-none focus:border-amber-500/60" />
            </div>
            <div>
              <label className="text-sm text-amber-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-[#1a0a00] border border-amber-900/40 rounded-xl px-4 py-3 pr-12 text-amber-100 placeholder-amber-800 focus:outline-none focus:border-amber-500/60" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-400">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-amber-500 text-[#1a0a00] font-black rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60 text-lg">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-amber-600 text-sm mt-6">
            Don't have an account? <Link to="/signup" className="text-amber-400 hover:text-amber-300 font-semibold">Sign Up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
