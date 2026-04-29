'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { 
  Users, 
  FileText, 
  Target, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  UserPlus
} from 'lucide-react';
import socket from '@/lib/socket';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { authFetch } from '@/lib/api';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';

const StatCard = ({ icon: Icon, label, value, trend, trendType, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm space-y-4 hover:shadow-md transition-shadow"
  >
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      <div className={`flex items-center gap-1 text-xs font-black ${trendType === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
        {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </div>
    <div>
      <div className="text-slate-500 text-xs font-black uppercase tracking-widest">{label}</div>
      <div className="text-3xl font-black text-slate-900 mt-1">{value}</div>
    </div>
  </motion.div>
);

const DashboardSkeleton = () => (
  <div className="space-y-10 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="space-y-4">
        <div className="h-10 w-64 bg-slate-200 rounded-xl" />
        <div className="h-4 w-96 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-12 w-64 bg-slate-200 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-40 bg-white border border-slate-100 rounded-3xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-96 bg-white border border-slate-100 rounded-3xl" />
      <div className="h-96 bg-white border border-slate-100 rounded-3xl" />
    </div>
  </div>
);

export default function InstructorDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const fetchStats = (filter, silent = false) => {
    if (!silent) setLoading(true);
    authFetch(`/exams/instructor/stats?filter=${filter}`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        if (!silent) setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    setMounted(true);
    // Auth is checked by InstructorLayout via useUser hook
    fetchStats(timeFilter);

    // Real-time Updates
    socket.on('instructorStatsUpdated', (newStats) => {
      console.log('Real-time instructor stats received:', newStats);
      
      if (newStats.recentActivity && newStats.recentActivity.length > 0) {
        const latest = newStats.recentActivity[newStats.recentActivity.length - 1];
        if (latest.type === 'completion') {
           toast.success(`A student just completed: ${latest.title} (${latest.score}%)`, {
             duration: 4000,
             icon: '🎯'
           });
        }
      }
      
      fetchStats(timeFilter, true);
    });

    socket.on('userStatusChanged', ({ userId, status }) => {
       console.log(`User ${userId} is now ${status}`);
       fetchStats(timeFilter, true);
    });

    socket.on('violationLogged', (data) => {
      console.log('🚨 Violation Alert received:', data);
      toast.error(`SECURITY BREACH: ${data.violation.reason}`, {
        duration: 6000,
        icon: '🛡️',
        style: { border: '2px solid #ef4444', background: '#fef2f2', fontWeight: 'bold' }
      });
      fetchStats(timeFilter, true);
    });

    return () => {
      socket.off('instructorStatsUpdated');
      socket.off('userStatusChanged');
      socket.off('violationLogged');
    };
  }, [timeFilter]);

  if (loading && !stats) return <InstructorLayout><DashboardSkeleton /></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Instructor Dashboard</h1>
            <p className="text-slate-500 font-medium mt-1">Real-time intelligence across all student cohorts.</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#E2E8F0] shadow-sm">
            {['today', 'week', 'month'].map((f) => (
              <button 
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  timeFilter === f 
                    ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20' 
                    : 'text-slate-500 hover:text-[#7C3AED] hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Total Students" value={stats.totalStudents} trend="+12%" trendType="up" color="bg-blue-500" />
          <StatCard icon={Activity} label="Active Learners" value={stats.activeStudents} trend="+4%" trendType="up" color="bg-emerald-500" />
          <StatCard icon={FileText} label="Assessments" value={stats.examsCreated} trend="+2 new" trendType="up" color="bg-purple-500" />
          <StatCard icon={Target} label="Class Accuracy" value={`${stats.avgClassScore}%`} trend="-2.1%" trendType="down" color="bg-amber-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] p-8 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900">Class Performance Trend</h3>
                <p className="text-slate-500 text-xs font-bold mt-1">Weighted average score across all subjects.</p>
              </div>
              <TrendingUp className="text-[#7C3AED]" size={24} />
            </div>
            <div className="h-80 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.cohortPerformance}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="bg-white border border-[#E2E8F0] p-8 rounded-3xl shadow-sm">
             <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
               <Calendar size={20} className="text-[#7C3AED]" />
               Recent Activity
             </h3>
             <div className="space-y-6">
               {stats.recentActivity.map((act, i) => (
                 <div key={i} className="flex gap-4 group cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-2xl transition-all">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${act.type === 'completion' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                     {act.type === 'completion' ? <Target size={18} /> : <UserPlus size={18} />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="text-sm font-bold text-slate-800 truncate group-hover:text-[#7C3AED] transition-colors">
                       {act.type === 'completion' ? `Score: ${act.score}%` : 'New Blueprint'}
                     </div>
                     <div className="text-xs font-medium text-slate-500 truncate">{act.title}</div>
                   </div>
                   <div className="text-[10px] font-black text-slate-400 uppercase mt-1 whitespace-nowrap">
                     {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </div>
                 </div>
               ))}
             </div>
             <Link href="/instructor/analytics" className="block w-full">
               <button className="w-full mt-8 py-3 bg-slate-50 border border-slate-100 text-slate-500 hover:text-[#7C3AED] rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-100 active:scale-95">
                 View Full Logs
               </button>
             </Link>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
