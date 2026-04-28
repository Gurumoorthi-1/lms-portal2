'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Terminal, Tag, Users, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const diffColor = {
  Easy:   { text: 'text-emerald-400',  bg: 'bg-emerald-400/10',  border: 'border-emerald-400/30' },
  Medium: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  Hard:   { text: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-rose-400/30' },
};

const langColorMap = { 
  javascript: '#F7DF1E', 
  python: '#3776AB', 
  java: '#ED8B00', 
  cpp: '#00599C', 
  html: '#E34F26', 
  css: '#1572B6', 
  bash: '#4EAA25', 
  yaml: '#CB171E' 
};

function ProblemsList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicId = searchParams.get('topicId');
  const slug = searchParams.get('slug');
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = topicId ? `/api/problems?topicId=${topicId}` : '/api/problems';
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setProblems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch problems:', err);
        setLoading(false);
      });
  }, [topicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <Link 
            href={topicId ? (slug ? `/courses/${slug}` : `/courses`) : "/student"}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-2xl border border-white/10 mb-8 font-bold text-sm"
          >
            <ChevronLeft size={18} /> {topicId ? 'Back to Path' : 'Back to Dashboard'}
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <Terminal className="text-blue-500" size={32} />
            <h1 className="text-3xl md:text-4xl font-black">{topicId ? 'Topic Challenges' : 'Practice Arena'}</h1>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
            {topicId ? `${problems.length} Challenges available for this topic` : `Exploring all ${problems.length} challenges`}
          </p>
        </header>

        <div className="space-y-4">
          {problems.map((problem, i) => {
            const d = diffColor[problem.difficulty] || diffColor.Easy;
            const lColor = langColorMap[problem.language] || '#888';

            return (
              <motion.div
                key={problem._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/problems/${problem._id}${slug ? `?slug=${slug}` : ''}`}>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-blue-500/50 transition-all cursor-pointer group flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-slate-700 font-black text-lg w-6 text-center group-hover:text-blue-500 transition-colors">
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                          {problem.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                          {problem.tags?.map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/5 px-2 py-1 rounded-md text-slate-500">
                              <Tag size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden md:flex items-center gap-6 mr-6 border-r border-white/10 pr-6">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Language</span>
                          <span className="text-xs font-bold" style={{ color: lColor }}>
                            {problem.language.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Activity</span>
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <Users size={12} className="text-slate-500" /> {problem.submissionCount}
                          </span>
                        </div>
                      </div>

                      <div className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${d.text} ${d.bg} ${d.border}`}>
                        {problem.difficulty}
                      </div>
                      
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <CheckCircle size={20} className="group-hover:block" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {problems.length === 0 && (
          <div className="bg-white/5 border border-dashed border-white/10 rounded-[32px] py-20 text-center">
            <div className="text-6xl mb-6 opacity-20">🔍</div>
            <h3 className="text-xl font-bold text-slate-400 mb-2">No Challenges Found</h3>
            <p className="text-slate-600 text-sm">We are still adding content to this topic. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProblemsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A]" />}>
      <ProblemsList />
    </Suspense>
  );
}
