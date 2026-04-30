'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Ghost, ArrowLeft, Home, Search, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#7C3AED]/10 to-transparent blur-3xl"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-[#2563EB]/10 to-transparent blur-3xl"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative inline-block mb-6"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#7C3AED] to-[#2563EB] rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Target size={40} className="text-white" />
          </div>
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A] mb-4">
          Full Assessment Already Completed
        </h1>
        
        <p className="text-[#64748B] text-base sm:text-lg font-medium mb-10 leading-relaxed px-4">
          You have already completed all stages of the assessment process. The page you are trying to access is no longer available. Please return to your dashboard to view your results or retake the assessment.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
          <button 
            onClick={() => router.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl border-2 border-[#E2E8F0] bg-white text-[#64748B] font-black hover:bg-[#F1F5F9] hover:text-[#0F172A] hover:border-[#CBD5E1] transition-all group shadow-sm"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
          
          <button 
            onClick={() => router.push('/student')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white font-black hover:shadow-lg hover:shadow-indigo-500/30 transition-all group"
          >
            <Home size={18} className="group-hover:scale-110 transition-transform" />
            Student Dashboard
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-12 p-5 sm:p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-[#E2E8F0] flex items-center gap-4 text-left mx-4"
        >
           <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#7C3AED] shrink-0 border border-indigo-100/50">
             <Target size={24} />
           </div>
           <div>
             <h3 className="font-black text-[#0F172A] text-sm mb-1">Want to improve your score?</h3>
             <p className="text-xs text-[#64748B] font-semibold leading-relaxed">Head back to the dashboard and click "Retake Full Assessment" to restart all stages and improve your performance.</p>
           </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
