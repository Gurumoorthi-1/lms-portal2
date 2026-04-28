'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, Trophy, Target, ChevronRight, GraduationCap, ChevronLeft } from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        setCourses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch courses:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <Link 
              href="/student" 
              className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-2xl border border-white/10"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-widest">Back to Dashboard</span>
            </Link>
            
            <div className="flex items-center gap-3 text-blue-400">
              <GraduationCap size={28} />
              <span className="text-xs font-black uppercase tracking-widest">Learning Paths</span>
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent"
          >
            Choose Your Mastery
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-2xl"
          >
            Structured courses designed to take you from absolute beginner to industry-ready engineer.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courses.map((course, idx) => (
            <Link key={course._id} href={`/courses/${course.slug}`}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02, translateY: -5 }}
                className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 overflow-hidden cursor-pointer"
              >
                {/* Background Gradient Effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at top right, ${course.color || '#3B82F6'}, transparent)` }}
                />

                <div className="relative z-10 flex flex-col md:flex-row gap-8">
                  <div 
                    className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shrink-0"
                    style={{ backgroundColor: `${course.color || '#3B82F6'}22`, border: `1px solid ${course.color || '#3B82F6'}44` }}
                  >
                    {course.icon || '🚀'}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">
                        {course.title}
                      </h2>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-slate-400 uppercase tracking-tighter">
                        {course.level}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-6 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <BookOpen size={14} className="text-blue-500" />
                        {course.totalTopics} Topics
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Target size={14} className="text-emerald-500" />
                        {course.totalProblems} Problems
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Trophy size={14} className="text-amber-500" />
                        {course.totalProblems * 10} XP
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center md:justify-end">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ChevronRight size={24} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
