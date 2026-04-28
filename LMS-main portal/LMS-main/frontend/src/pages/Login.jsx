import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow"/>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-purple/10 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay:'2s'}}/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-cyan/5 rounded-full blur-3xl"/>
      </div>

      <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}
        className="relative w-full max-w-md px-8 py-10 glass rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-purple mb-4 text-2xl shadow-lg">⚡</div>
          <h1 className="font-display font-bold text-white text-2xl">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to continue coding</p>
        </div>

        {error && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="w-full bg-surface-800 border border-white/10 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 placeholder-slate-600 transition-all"/>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
              placeholder="••••••••"
              className="w-full bg-surface-800 border border-white/10 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 placeholder-slate-600 transition-all"/>
          </div>
          <button type="submit" disabled={loading}
            className="w-full btn-primary py-3 rounded-xl text-sm font-semibold mt-2 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in...</> : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          No account?{' '}
          <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Create one free</Link>
        </p>
      </motion.div>
    </div>
  );
}
