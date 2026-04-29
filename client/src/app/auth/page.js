'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Target, ArrowRight, Zap, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { fetchUserFromDB, BASE_URL } from '@/lib/api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true); // Default to Login for better user experience
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin 
      ? { email: formData.email, password: formData.password }
      : formData;

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      if (data.access_token) {
        if (!isLogin) {
          setIsLogin(true);
          toast.success("Account successfully created! Please sign in.");
          return;
        }

        // Save JWT token to localStorage (required for all subsequent authFetch calls)
        localStorage.setItem('token', data.access_token);
        // Save the login-time user snapshot as cache
        localStorage.setItem('user', JSON.stringify(data.user));

        // Set cookie for Middleware access
        document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;

        // Immediately sync with DB to get the freshest user data (xp, level, streak)
        await fetchUserFromDB();

        toast.success(`Welcome back, ${data.user.username || 'Learner'}!`);

        // RBAC Navigation
        if (data.user.role === 'instructor') {
          router.push('/instructor');
        } else {
          router.push('/student');
        }
      }

    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Action failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center flex-col items-center">
           <div className="w-14 h-14 bg-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
             <Target className="text-white" size={32} />
           </div>
           <h2 className="text-center text-3xl font-black tracking-tight text-[#0F172A]">
             {isLogin ? 'Welcome back' : 'Create your account'}
           </h2>
           <p className="mt-2 text-center text-sm text-[#64748B] font-medium">
             {isLogin ? "Enter your gateway to learning" : "Join the next generation AI learning platform"}
           </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 rounded-3xl sm:px-10 border border-[#E2E8F0]"
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-xs font-black uppercase tracking-widest text-[#64748B] mb-2">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-[#94A3B8]" />
                  </div>
                  <input
                    name="username"
                    type="text"
                    required={!isLogin}
                    value={formData.username}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-3 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all outline-none text-sm font-medium"
                    placeholder="Enter unique username"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[#64748B] mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#94A3B8]" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-3 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all outline-none text-sm font-medium"
                  placeholder="you@university.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[#64748B] mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#94A3B8]" />
                </div>
                <input
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  type={showPassword ? "text" : "password"}
                  className="block w-full pl-11 pr-12 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all outline-none text-sm font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#94A3B8] hover:text-[#7C3AED] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-500 font-bold text-xs p-3 rounded-xl border border-rose-100 flex items-center gap-2">
                 <Zap size={16} /> {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-purple-500/30 text-sm font-black text-white bg-[#7C3AED] hover:bg-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7C3AED] transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                {!loading && <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E8F0]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#64748B] font-bold">
                  {isLogin ? "New to the platform?" : "Already have an account?"}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="w-full flex justify-center py-3 px-4 border border-[#E2E8F0] rounded-xl text-sm font-black text-[#0F172A] bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                {isLogin ? 'Create an account' : 'Sign in to existing account'}
              </button>
            </div>
          </div>
          
        </motion.div>
      </div>
    </div>
  );
}
