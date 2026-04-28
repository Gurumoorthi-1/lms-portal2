'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Rocket, Target, Clock, Star, Zap } from 'lucide-react';
import Link from 'next/link';

const diffColor = { 
  Easy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', 
  Medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20', 
  Hard: 'text-rose-400 bg-rose-400/10 border-rose-400/20' 
};

export default function CourseRoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseRes = await fetch(`/api/courses/${params.slug}`);
        const courseData = await courseRes.json();
        setCourse(courseData);

        const topicsRes = await fetch(`/api/courses/${courseData._id}/topics`);
        const topicsData = await topicsRes.json();
        setTopics(topicsData);
      } catch (err) {
        console.error('Failed to fetch roadmap:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) return <div className="min-h-screen bg-[#0F172A] p-20 text-white">Course not found.</div>;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6 md:p-12 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="mb-16 relative">
          <Link 
            href="/courses" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-2xl border border-white/10 mb-8 font-bold text-sm"
          >
            <ChevronLeft size={18} /> Back to Courses
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-28 h-28 rounded-[40px] flex items-center justify-center text-6xl shadow-2xl shrink-0 relative"
              style={{ backgroundColor: `${course.color || '#3B82F6'}22`, border: `2px solid ${course.color || '#3B82F6'}44` }}
            >
              <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full -z-10" />
              {course.icon || '🚀'}
            </motion.div>

            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent"
              >
                {course.title} Roadmap
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400 text-sm font-bold uppercase tracking-widest"
              >
                <span className="flex items-center gap-2"><Clock size={16} /> 12 Weeks</span>
                <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                <span className="flex items-center gap-2"><Target size={16} /> {course.totalProblems} Challenges</span>
                <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                <span className="flex items-center gap-2 text-blue-400"><Star size={16} /> {course.level}</span>
              </motion.div>
            </div>
          </div>
        </header>

        {/* Roadmap Path */}
        <div className="relative">
          {/* Main vertical connector */}
          <div className="absolute left-7 top-0 bottom-10 w-1 bg-gradient-to-b from-blue-500 via-blue-500/20 to-transparent rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)]" />

          <div className="space-y-6">
            {topics.map((topic, i) => (
              <motion.div 
                key={topic._id}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative pl-20 group"
              >
                {/* Node marker */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-2xl bg-[#0F172A] border-4 border-blue-500 flex items-center justify-center z-10 transition-transform group-hover:scale-125 duration-300">
                  <div className="text-[10px] font-black text-white">{i + 1}</div>
                </div>

                <Link href={`/problems?topicId=${topic._id}&slug=${params.slug}`}>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl p-3 bg-white/5 rounded-2xl group-hover:bg-blue-600/10 transition-colors">
                          {topic.icon || '📚'}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-1">
                            {topic.title}
                          </h3>
                          <p className="text-slate-400 text-sm line-clamp-1">{topic.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-tighter ${diffColor[topic.difficulty]}`}>
                          {topic.difficulty}
                        </span>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase">
                          <Zap size={14} className="text-blue-500" />
                          {topic.totalProblems} Problems
                        </div>
                        <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Completion Indicator */}
        <div className="mt-12 pl-20">
          <div className="w-10 h-10 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center text-slate-600">
            <Rocket size={20} />
          </div>
          <p className="text-slate-500 text-sm font-bold mt-4 uppercase tracking-widest">Mastery Achieved</p>
        </div>
      </div>
    </div>
  );
}
