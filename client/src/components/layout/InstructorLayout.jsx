'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  FilePlus, 
  Users, 
  PieChart, 
  Settings,
  Sparkles,
  Search,
  ChevronLeft,
  Menu,
  X,
  User,
  LogOut,
  Bell,
  FileText,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '@/lib/socket';
import { useUser } from '@/hooks/useUser';

export default function InstructorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Always fetch fresh user from DB via JWT token
  const { user = { username: 'Instructor' } } = useUser({ requireAuth: true, redirectIfNoAuth: true });

  useEffect(() => {
    if (!user) return;
    const userId = user.id || user._id;
    if (userId) {
      socket.emit('identify', { userId, role: 'instructor' });
      const handleReconnect = () => socket.emit('identify', { userId, role: 'instructor' });
      socket.on('connect', handleReconnect);
      return () => socket.off('connect', handleReconnect);
    }
  }, [user?.id]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    router.replace('/auth');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Overview', href: '/instructor' },
    { icon: FilePlus, label: 'Create Exam', href: '/instructor/generate' },
    { icon: FileText, label: 'Exams List', href: '/instructor/exams' },
    { icon: Users, label: 'Students', href: '/instructor/students' },
    { icon: Building2, label: 'Institution Flow', href: '/instructor/institution-users' },
    { icon: PieChart, label: 'Analytics', href: '/instructor/analytics' },
  ];

  const bottomItems = [];

  return (
    <div className="flex h-screen bg-[#F1F5F9] text-[#0F172A] font-sans selection:bg-purple-500/10 overflow-hidden">
      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="hidden md:flex flex-col bg-white border-r border-[#E2E8F0] shadow-sm relative z-30"
      >
        <div className="h-20 flex items-center px-6 gap-3 border-b border-[#E2E8F0]">
          <div className="w-10 h-10 bg-[#7C3AED] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
            <Sparkles className="text-white" size={24} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter leading-none text-[#7C3AED]">INSTRUCTOR</span>
              <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] mt-0.5">PRO PANEL</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} prefetch={true}>
              <motion.div
                whileHover={{ x: 4, backgroundColor: '#F8FAFC' }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                  pathname === item.href 
                    ? "bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20" 
                    : "text-slate-600 hover:text-[#7C3AED]"
                }`}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
              </motion.div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full h-12 flex items-center justify-center gap-3 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors mb-2"
          >
            <ChevronLeft className={collapsed ? "rotate-180" : ""} size={20} />
            {!collapsed && <span className="font-bold text-sm">Collapse Sidebar</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 md:px-10 shrink-0 z-20">
          <div className="flex items-center gap-6 flex-1">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-slate-600"><Menu size={24} /></button>
            <div className="hidden md:flex items-center relative w-full max-w-md">
              <Search className="absolute left-4 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search across student cohorts..."
                className="w-full h-11 pl-12 pr-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl outline-none focus:border-purple-500 transition-all text-sm font-medium text-slate-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-[#7C3AED] bg-slate-50 rounded-xl transition-all relative border border-slate-100">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-purple-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-100 mx-2" />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800">{user?.username || 'Instructor Portal'}</span>
              <span className="text-[10px] uppercase font-black text-[#7C3AED] tracking-widest">Instructor</span>
            </div>
            <div onClick={handleLogout} className="w-11 h-11 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-500 hover:text-white hover:bg-rose-500 cursor-pointer transition-colors shadow-sm" title="Logout">
              <LogOut size={20} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F1F5F9] custom-scrollbar">
          <div className="p-6 md:p-10">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
