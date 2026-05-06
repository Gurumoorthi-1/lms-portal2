'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, Globe, Zap, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { fetchUserFromDB, BASE_URL } from '@/lib/api';

export default function InstitutionalLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    institutionId: '',
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

    try {
      const res = await fetch(`${BASE_URL}/auth/institution-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Institutional Authentication failed');
      }

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;

        await fetchUserFromDB();
        toast.success(`Access Granted: ${data.user.institutionName || 'Authorized Personnel'}`);

        if (data.user.role === 'instructor') {
          router.push('/instructor');
        } else {
          router.push('/student');
        }
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Login failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex overflow-hidden font-sans">
      {/* Decorative Side Panel - Premium Aesthetic */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1E293B] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#334155_0%,transparent_70%)] opacity-50" />
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 p-12 max-w-xl"
        >
          <div className="w-20 h-20 bg-indigo-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-8">
            <Building2 className="text-white" size={40} />
          </div>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Institutional <span className="text-indigo-400">Gateway</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed mb-10">
            Secure enterprise access for educational institutions and corporate partners. 
            Manage assessments, track growth, and scale excellence.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: ShieldCheck, label: 'SSO Secured', color: 'text-emerald-400' },
              { icon: Globe, label: 'Global Access', color: 'text-blue-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <item.icon className={item.color} size={24} />
                <span className="text-sm font-bold text-slate-200">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Login Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[#0F172A] relative">
        <div className="absolute top-0 right-0 p-8">
           <button 
             onClick={() => router.push('/auth')}
             className="text-slate-400 hover:text-white font-bold text-sm flex items-center gap-2 transition-colors"
           >
             Personal Login <ArrowRight size={16} />
           </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-white tracking-tight">Institutional Sign In</h2>
            <p className="mt-2 text-slate-400 font-medium">Please enter your authorized credentials to continue.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-1">Institution ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-indigo-400 transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <input
                  name="institutionId"
                  type="text"
                  required
                  value={formData.institutionId}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white text-sm font-medium placeholder:text-slate-600"
                  placeholder="e.g. UNIV-10293"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-indigo-400 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white text-sm font-medium placeholder:text-slate-600"
                  placeholder="admin@institution.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  type={showPassword ? "text" : "password"}
                  className="block w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white text-sm font-medium placeholder:text-slate-600"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-500/10 text-rose-400 font-bold text-xs p-4 rounded-2xl border border-rose-500/20 flex items-center gap-3"
              >
                 <Zap size={18} /> {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center h-16 rounded-2xl shadow-2xl shadow-indigo-500/20 text-base font-black text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? 'Authenticating...' : 'Sign In to Gateway'}
              {!loading && <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="text-center text-xs font-medium text-slate-500 pt-8">
            Having trouble? Contact your institutional administrator for access recovery.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
