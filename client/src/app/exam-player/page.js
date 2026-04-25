'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X, Maximize2, Minimize2, MessageSquare, Trophy, Target, XCircle, RotateCcw,
  Shield, ShieldAlert, PlayCircle, Lock, ArrowRight, ShieldCheck, Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Modal from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import AiTutorPanel from '@/components/exam/AiTutorPanel';
import { useExamStore } from '@/store/useExamStore';
import Skeleton from '@/components/ui/Skeleton';
import { authFetch } from '@/lib/api';
import { toast } from 'react-hot-toast';

// ── Optimized Components ──
import QuestionCard from '@/components/exam/QuestionCard';
import ExamTimer from '@/components/exam/ExamTimer';
import ExamNavigator from '@/components/exam/ExamNavigator';
import ExamFooter from '@/components/exam/ExamFooter';
import FaceDetection from '@/components/exam/FaceDetection';

const EXAM_DATA = {
  title: 'Java Basics - Beginner Exam',
  totalTime: 600,
  questions: []
};

const ExamSkeleton = () => (
  <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden animate-pulse">
    <div className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6">
      <div className="flex items-center gap-4"><Skeleton className="h-6 w-16" /><div className="h-6 w-px bg-[#E2E8F0]" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div>
      <div className="flex gap-3"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-32" /></div>
    </div>
    <div className="h-1.5 bg-[#E2E8F0]" />
    <div className="flex-1 p-12 space-y-10"><Skeleton className="h-12 w-3/4" /><div className="space-y-4 max-w-3xl">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div></div>
  </div>
);

export default function ExamPlayer() {
  const router = useRouter();
  const currentExam = useExamStore((state) => state.currentExam);
  const setExamResults = useExamStore((state) => state.setExamResults);
  
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);

  const activeExam = useMemo(() => currentExam || EXAM_DATA, [currentExam]);
  const { questions, title } = activeExam;
  const totalTime = useMemo(() => activeExam.totalTime || (activeExam.duration ? activeExam.duration * 60 : 600), [activeExam]);
  const validExam = useMemo(() => questions && questions.length > 0, [questions]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(totalTime || 600);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showTutor, setShowTutor] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const submitLockRef = useRef(false);

  const [tabViolationCount, setTabViolationCount] = useState(0);
  const [fsViolationCount, setFsViolationCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleFinish = useCallback(async (isManual = false, bypassConfirm = false, statusOverwrite = 'completed') => {
    if (submitLockRef.current || isSubmitting || showSuccess) return;
    if (!isManual && timeLeft > 0 && statusOverwrite === 'completed') return;

    if (isManual && !bypassConfirm && Object.keys(answers).length < questions.length && statusOverwrite === 'completed') {
      setShowConfirm(true);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setShowConfirm(false);
    
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const key = q.id !== undefined ? q.id : idx;
      if (answers[key] === q.correct) correctCount++;
    });
    const finalScore = statusOverwrite === 'disqualified' ? 0 : Math.round((correctCount / (questions.length || 1)) * 100);

    const resultData = { 
      title, 
      questions, 
      userAnswers: answers, 
      timeSpent: totalTime - timeLeft, 
      totalTime, 
      score: finalScore,
      status: statusOverwrite
    };

    if (activeExam.id || activeExam._id) {
      try {
        const userStr = localStorage.getItem('user');
        const cachedUser = userStr ? JSON.parse(userStr) : null;
        await authFetch(`/exams/${activeExam.id || activeExam._id}/submit`, {
          method: 'PATCH',
          body: JSON.stringify({ 
            score: finalScore, 
            userId: cachedUser?.id || cachedUser?._id, 
            userAnswers: answers, 
            timeSpent: totalTime - timeLeft,
            status: statusOverwrite
          }),
        });
        localStorage.removeItem('dashboard_exams');
        localStorage.removeItem('dashboard_stats');
      } catch (err) {} 
    }

    setExamResults(resultData);
    setFinalResult(resultData);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    if (resultData.status !== 'disqualified' && resultData.score >= 70) {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#2563EB', '#7C3AED', '#22C55E'] });
      // Restore previous behavior: Auto-navigate to result page on pass
      setTimeout(() => {
        router.push(`/results?id=${activeExam.id || activeExam._id}`);
      }, 2500);
    }
    setShowSuccess(true);
  }, [questions, answers, activeExam, totalTime, timeLeft, setExamResults, isSubmitting, showSuccess, title, router]);

  const handleRetest = useCallback(() => {
    setAnswers({}); setTimeLeft(totalTime); setShowSuccess(false); setFinalResult(null);
    setCurrentIdx(0); setIsSubmitting(false); submitLockRef.current = false;
    setTabViolationCount(0); setFsViolationCount(0); setIsStarted(true);
  }, [totalTime]);

  const [violationCount, setViolationCount] = useState(0);
  const lastViolationRef = useRef(0);

  const handleViolation = useCallback(async (reason, severity = 'warning') => {
    const now = Date.now();
    // Throttle duplicate violations (e.g. only once every 3s)
    if (now - lastViolationRef.current < 3000) return;
    
    lastViolationRef.current = now;

    // Side effects should be outside of the state setter
    if (activeExam?._id || activeExam?.id) {
       authFetch(`/exams/${activeExam._id || activeExam.id}/violation`, {
         method: 'POST',
         body: JSON.stringify({ reason, timestamp: new Date() })
       }).catch(() => {});
    }

    toast.error(`Proctoring Alert: ${reason}`, {
      duration: 4000,
      style: { 
        background: '#0F172A', 
        color: '#fff', 
        border: '2px solid #EF4444',
        fontSize: '12px',
        fontWeight: 900
      },
      icon: <ShieldAlert className="text-red-500" />
    });

    setViolationCount(prev => prev + 1);
  }, [activeExam]);

  useEffect(() => {
    if (violationCount >= 5 && !isSubmitting && !showSuccess) {
      toast.error("EXAM TERMINATED: Too many proctoring violations.", { duration: 6000 });
      handleFinish(true, true, 'disqualified');
    }
  }, [violationCount, isSubmitting, showSuccess, handleFinish]);

  // Merge Tab switching into the unified violation system
  useEffect(() => {
    if (!isStarted || showSuccess || isSubmitting) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab switching detected", "severe");
      }
    };
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullScreen(false);
        handleViolation("Exited full-screen mode", "severe");
      } else setIsFullScreen(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isStarted, showSuccess, isSubmitting, handleViolation]);

  useEffect(() => {
    if (!validExam || loading || showSuccess || !isStarted) return;
    if (timeLeft <= 0) { handleFinish(false); return; }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, validExam, loading, showSuccess, handleFinish, isStarted]);

  const startExamFlow = async () => {
    try {
      if (document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); setIsFullScreen(true); }
      setIsStarted(true);
      toast.success("AI Proctoring System: ONLINE");
    } catch (err) { setIsStarted(true); }
  };

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  if (loading) return <ExamSkeleton />;
  if (!validExam) return <div className="h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center"><h1 className="text-2xl font-black mb-2">No Exam Found</h1><Link href="/student"><button className="h-12 px-8 bg-[#2563EB] text-white rounded-2xl font-bold">Back to Dashboard</button></Link></div>;

  if (!isStarted && !showSuccess) {
    return (
      <div className="h-screen bg-[#0F172A] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl w-full bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl text-center space-y-8">
          <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20">
            <Shield size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">AI Proctoring Gate</h1>
            <p className="text-slate-400 font-medium text-sm px-6">Identity verification and environment check is mandatory. Maintain focus on the screen.</p>
          </div>

          <FaceDetection mode="gate" onVerificationComplete={setFaceVerified} />

          <div className="grid grid-cols-2 gap-4 text-left">
             <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">AI Proctor</div>
                <div className={`text-sm font-bold ${faceVerified ? 'text-emerald-400' : 'text-amber-500'}`}>{faceVerified ? 'Secure Environment' : 'System Booting...'}</div>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Limit</div>
                <div className="text-sm font-bold text-white">5 Violations = BAN</div>
             </div>
          </div>

          <button 
            onClick={startExamFlow}
            disabled={!faceVerified}
            className={`w-full h-16 rounded-[24px] font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${
              faceVerified ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40' : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            Start Proctored Exam <PlayCircle size={24} />
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const selectedAnswer = answers[currentQuestion.id !== undefined ? currentQuestion.id : currentIdx];
  const progress = (currentIdx / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden select-none">
      <FaceDetection mode="floating" onViolation={handleViolation} />
      <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/student')} className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] font-bold text-sm"><X size={20} /> Exit</button>
          <div className="h-6 w-px bg-[#E2E8F0]" />
          <div><div className="font-bold text-[#0F172A] text-sm uppercase">{title}</div><div className="text-xs font-bold text-[#64748B]">{answeredCount} of {questions.length} answered</div></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 mr-4 px-4 py-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs font-black">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isFullScreen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[#64748B] uppercase tracking-tighter">AI Security Status</span>
             </div>
             <div className="w-px h-3 bg-[#E2E8F0]" />
             <div className="flex items-center gap-2 text-[#64748B] uppercase tracking-tighter">Violations: <span className={violationCount > 0 ? 'text-red-500' : ''}>{violationCount}/5</span></div>
          </div>
          <button onClick={() => setShowTutor(!showTutor)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-xs font-bold transition-all ${showTutor ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-[#E2E8F0] text-[#64748B]'}`}><MessageSquare size={16} /> AI Tutor</button>
          <ExamTimer timeLeft={timeLeft} />
          <button onClick={toggleFullScreen} className="p-2.5 text-[#64748B] hover:bg-[#F8FAFC] rounded-lg">{isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
        </div>
      </header>
      <div className="h-1 bg-[#E2E8F0] w-full shrink-0"><motion.div animate={{ width: `${progress}%` }} className="h-full bg-blue-600" /></div>
      <div className="flex-1 overflow-hidden flex min-h-0">
        <QuestionCard question={currentQuestion} currentIdx={currentIdx} totalQuestions={questions.length} selectedAnswer={selectedAnswer} onSelect={(id) => setAnswers(prev => ({...prev, [currentQuestion.id || currentIdx]: id}))} />
        {!showTutor && <ExamNavigator questions={questions} currentIdx={currentIdx} answers={answers} onNavigate={setCurrentIdx} onFinish={handleFinish} isSubmitting={isSubmitting} />}
        {showTutor && <div className="w-80 shrink-0 border-l border-[#E2E8F0] overflow-y-auto bg-white"><AiTutorPanel questionIdx={currentIdx} questionText={currentQuestion.text} onClose={() => setShowTutor(false)} /></div>}
      </div>
      <ExamFooter currentIdx={currentIdx} totalQuestions={questions.length} onNavigate={setCurrentIdx} onFinish={handleFinish} isSubmitting={isSubmitting} answers={answers} questions={questions} />
      
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} className="bg-[#0F172A] border-white/5">
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><Target size={32} /></div>
          <h2 className="text-xl font-black text-white mb-2">Unanswered Questions</h2>
          <p className="text-slate-400 text-sm mb-8">You have only answered {answeredCount} questions. Submit anyway?</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => handleFinish(true, true)} className="h-14 bg-red-600 text-white rounded-2xl font-black">Submit Anyway</button>
            <button onClick={() => setShowConfirm(false)} className="h-14 bg-white/5 text-white rounded-2xl font-bold">Review Answers</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showSuccess} onClose={() => router.push('/student?refresh=true')} showClose={false} className="bg-[#0F172A] border-white/5">
        <div className="text-center space-y-8 py-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-32 h-32 mx-auto rounded-[40px] flex items-center justify-center shadow-2xl ${finalResult?.score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {finalResult?.score >= 70 ? <Trophy size={64} /> : <XCircle size={64} />}
          </motion.div>
          <div className="space-y-2">
            <h2 className={`text-3xl font-black ${finalResult?.score >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>{finalResult?.score >= 70 ? 'Exam Passed' : 'Exam Failed'}</h2>
            <p className="text-slate-400">Score: <span className="text-white font-bold">{finalResult?.score}%</span></p>
          </div>
          <div className="pt-2 px-2 flex flex-col gap-3">
            {finalResult?.score >= 70 ? (
              <button 
                onClick={() => router.push(`/results?id=${activeExam.id || activeExam._id}`)} 
                className="h-16 bg-emerald-500 text-white rounded-[24px] font-black flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/40"
              >
                View Result <ArrowRight size={20} />
              </button>
            ) : (
              <button onClick={handleRetest} className="h-16 bg-white text-[#0F172A] rounded-[24px] font-black flex items-center justify-center gap-3">
                Retest Now <RotateCcw size={20} />
              </button>
            )}
            <button onClick={() => router.push('/student')} className="h-14 bg-white/5 text-slate-300 rounded-[24px] font-bold border border-white/5">Exit to Dashboard</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
