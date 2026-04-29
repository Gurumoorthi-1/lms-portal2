'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RevisionSystem from '@/components/exam/RevisionSystem';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Tooltip from '@/components/ui/Tooltip';
import socket from '@/lib/socket';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  Clock, 
  Play, 
  ArrowRight, 
  MoreVertical,
  BookOpen,
  Inbox,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/store/useExamStore';
import { useUser } from '@/hooks/useUser';
import { authFetch } from '@/lib/api';

const StatCard = ({ icon: Icon, label, value, trend, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ scale: 1.03 }}
    className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-6 flex items-start gap-4 transition-all"
  >
    <div className="w-12 h-12 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#2563EB] shrink-0">
      <Icon size={24} />
    </div>
    <div>
      <div className="text-sm font-bold text-[#64748B] mb-1">{label}</div>
      <div className="text-2xl font-black text-[#0F172A]">{value}</div>
      {trend !== undefined && (
        <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${trend >= 0 ? 'text-[#22C55E]' : 'text-red-500'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} /> {Math.abs(trend)}% this week
        </div>
      )}
    </div>
  </motion.div>
);

const ExamCard = ({ exam, index }) => {
  const router = useRouter();
  const setExam = useExamStore((state) => state.setExam);
  const setExamResults = useExamStore((state) => state.setExamResults);

  const startExam = (e) => {
    e?.stopPropagation();
    setExam({
      id: exam._id,
      title: exam.title,
      topic: exam.topic,
      questions: exam.questions,
      totalTime: exam.duration * 60,
      duration: exam.duration
    });
    router.push('/exam-player');
  };

  const showResults = () => {
    if (exam.status === 'completed') {
      setExamResults({
        title: exam.title,
        questions: exam.questions,
        userAnswers: exam.userAnswers || {}, 
        score: exam.score,
        timeSpent: exam.timeSpent || 0, 
        totalTime: (exam.duration || 10) * 60
      });
      router.push('/results');
    } else {
      startExam();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all cursor-pointer group hover:border-[#2563EB]"
      onClick={showResults}
    >
      <div className="flex items-center gap-5">
         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
           exam.status === 'completed' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#2563EB]/10 text-[#2563EB]'
         }`}>
           <BookOpen size={24} />
         </div>
         <div>
           <div className="flex items-center gap-2 mb-1">
             <h3 className="font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">{exam.title}</h3>
             <span className="text-[10px] font-black px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[#64748B] uppercase">
               {exam.topic}
             </span>
           </div>
           <div className="flex items-center gap-4 text-xs font-bold text-[#64748B]">
             <span className="flex items-center gap-1"><Clock size={12} /> {exam.duration}m</span>
             <span className="flex items-center gap-1"><Target size={12} /> {exam.questionCount} Questions</span>
           </div>
         </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-8">
         {exam.status === 'disqualified' ? (
           <div className="text-right">
             <div className="text-xl font-black text-red-500 uppercase">Blocked</div>
             <div className="text-[10px] uppercase font-bold text-red-400">Security Breach</div>
           </div>
         ) : exam.status === 'completed' && (exam.score || 0) >= 70 ? (
           <div className="text-right">
             <div className="text-xl font-black text-[#0F172A]">{exam.score}%</div>
             <div className="text-[10px] uppercase font-bold text-[#22C55E]">Completed</div>
           </div>
         ) : (
           <div className="text-right">
             <div className="text-xl font-black text-[#64748B]">{exam.score > 0 ? `${exam.score}%` : '--'}</div>
             <div className="text-[10px] uppercase font-bold text-[#64748B]">
               {exam.score > 0 && exam.score < 70 ? 'Retake Required' : 'Ready'}
             </div>
           </div>
         )}
         
        <Tooltip content={exam.status === 'completed' ? 'Retake Exam' : 'Start Exam'} position="left">
          <button 
            onClick={startExam}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              exam.status === 'completed' ? 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB]' : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-md'
            }`}
          >
            {exam.status === 'completed' ? <RotateCcw size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
        </Tooltip>
      </div>
    </motion.div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex items-start gap-4 animate-pulse">
    <div className="w-12 h-12 bg-slate-100 rounded-xl" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-6 bg-slate-100 rounded w-1/2" />
    </div>
  </div>
);

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const router = useRouter();

  // Get user from DB — redirects to /auth if not logged in
  const { user } = useUser({ requireAuth: true, redirectIfNoAuth: true });

  const fetchData = async () => {
    try {
      // Read userId from localStorage cache (kept in sync by useUser/fetchUserFromDB)
      const userStr = localStorage.getItem('user');
      const cachedUser = userStr ? JSON.parse(userStr) : null;
      const userId = cachedUser?.id || cachedUser?._id;

      const statsUrl = userId ? `/exams/stats?userId=${userId}` : '/exams/stats';
      const examsUrl = userId ? `/exams?userId=${userId}` : '/exams';
      const progressUrl = '/progress/me';

      const [statsRes, examsRes, progressRes] = await Promise.all([
        authFetch(statsUrl, { cache: 'no-store' }),
        authFetch(examsUrl, { cache: 'no-store' }),
        authFetch(progressUrl, { cache: 'no-store' })
      ]);

      if (statsRes.ok && examsRes.ok && progressRes.ok) {
        const statsData = await statsRes.json();
        const examsData = await examsRes.json();
        const progressData = await progressRes.json();

        // Merge progress data into stats
        const mergedStats = {
          ...statsData,
          totalXP: progressData.points || 0,
          solvedProblems: progressData.solvedProblems?.length || 0,
          solvedChallenges: progressData.solvedChallenges?.length || 0
        };

        // AGGRESSIVE DEDUPLICATION: Group by Title + Topic
        const dedupMap = new Map();
        
        examsData.forEach(exam => {
          const key = `${exam.title}_${exam.topic}`.toLowerCase().trim();
          const existing = dedupMap.get(key);
          
          if (!existing) {
            dedupMap.set(key, exam);
          } else {
            const isNewCompleted = exam.status === 'completed';
            const isOldCompleted = existing.status === 'completed';
            
            if (isNewCompleted && !isOldCompleted) {
              dedupMap.set(key, exam);
            } else if (isNewCompleted && isOldCompleted && (exam.score > existing.score)) {
              dedupMap.set(key, exam);
            }
          }
        });

        const finalExams = Array.from(dedupMap.values());

        setStats(mergedStats);
        setRecentExams(finalExams);
        
        // Sync cache with deduplicated data
        localStorage.setItem('dashboard_stats', JSON.stringify(mergedStats));
        localStorage.setItem('dashboard_exams', JSON.stringify(finalExams));
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sync from cache instantly on mount BUT trigger a background refresh
    const cachedStats = localStorage.getItem('dashboard_stats');
    const cachedExams = localStorage.getItem('dashboard_exams');
    
    // Skip old cache if we just came from an exam
    const bypassCache = window.location.search.includes('refresh=true');

    if (cachedStats && !bypassCache) {
      setStats(JSON.parse(cachedStats));
      setLoading(false);
    }
    if (cachedExams && !bypassCache) {
      setRecentExams(JSON.parse(cachedExams));
    }

    fetchData();

    socket.on('statsUpdated', (newStats) => {
      setStats(newStats);
      fetchData();
    });
    socket.on('examCreated', () => fetchData());
    socket.on('examDeleted', () => fetchData());

    return () => {
      socket.off('statsUpdated');
      socket.off('examCreated');
      socket.off('examDeleted');
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Student Dashboard</h1>
              <p className="text-[#64748B] font-medium mt-1">Monitor your assigned exams and track your performance.</p>
           </div>
        </div>

        {error ? (
          <ErrorState 
            title="Unable to load dashboard data" 
            description="Our servers are taking a bit longer to respond. Please check your connection and try again."
            onRetry={() => { setLoading(true); setError(false); fetchData(); }} 
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {loading ? (
                  [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  <>
                    <StatCard icon={Target} label="Exam Accuracy" value={`${stats?.overallAccuracy || 0}%`} trend={5.2} delay={0.1} />
                    <StatCard icon={TrendingUp} label="Exams Completed" value={recentExams.filter(e => e.status === 'completed').length} trend={12} delay={0.2} />
                    <StatCard icon={Sparkles} label="Coding XP" value={stats?.totalXP || 0} delay={0.3} />
                    <StatCard icon={BookOpen} label="Problems Solved" value={stats?.solvedProblems || 0} delay={0.4} />
                  </>
                )}
            </div>

            {!loading && stats?.weakAreas && (stats.weakAreas.length > 0) && (
              <RevisionSystem weakTopics={stats.weakAreas} />
            )}

            <div className="space-y-6">
               <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                  <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
                    Your Assigned Exams
                  </h2>
               </div>

               <div className="grid grid-cols-1 gap-4">
                 {loading ? (
                    [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
                 ) : recentExams.length > 0 ? (
                    recentExams.map((exam, i) => (
                      <ExamCard key={exam._id} exam={exam} index={i} />
                    ))
                 ) : (
                    <EmptyState 
                      title="No exams assigned yet" 
                      description="Check back later or contact your instructor to get started with your first assessment."
                    />
                 )}
               </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
