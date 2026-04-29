'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterviewStore } from '@/hooks/useInterviewStore';
import Skeleton from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import Modal from '@/components/ui/Modal';
import { ArrowLeft, ShieldAlert, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSecurity } from '@/components/providers/SecurityProvider';

const FaceDetection = dynamic(() => import('@/components/exam/FaceDetection'), { ssr: false });

function Timer({ totalSeconds, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  
  return (
    <div className={`font-mono font-bold px-3 py-1 rounded-lg ${timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
      ⏱ {m}:{s}
    </div>
  );
}

export default function AptitudePage() {
  const router = useRouter();
  const { skills, setAptitudeResults } = useInterviewStore();
  const [phase, setPhase] = useState('setup');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [hintsUsed, setHintsUsed] = useState({});
  const [showHint, setShowHint] = useState(false);
  const [timeLimit, setTimeLimit] = useState(600);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Security Orchestrator
  const { 
    totalViolations, 
    isDisqualified, 
    startSecurity, 
    reportViolation,
    config: securityConfig
  } = useSecurity();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const pageLoadTimeRef = useRef(Date.now());

  const handleAIViolation = useCallback((reason, severity = 'warning', type = 'ai_alert') => {
    reportViolation(type, reason, severity);
  }, [reportViolation]);

  const handleSubmit = useCallback(async (isDisqualifiedParam = false) => {
    if (submitted) return;
    const isDisqualified = typeof isDisqualifiedParam === 'boolean' ? isDisqualifiedParam : false;
    
    setSubmitted(true);
    setLoading(true);
    try {
      const answersArr = questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] ?? -1,
        usedHint: !!hintsUsed[q.id]
      }));
      
      const res = await fetch('http://localhost:5001/aptitude/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ answers: answersArr, questions })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submit failed');
      
      if (isDisqualified) {
         data.passed = false;
         data.message = 'Exam Terminated due to Security Violations.';
         data.score = 0;
      }

      // Persist the new token to allow stage-based navigation to Coding Round
      if (data.newToken) {
        localStorage.setItem('token', data.newToken);
        document.cookie = `token=${data.newToken}; path=/; max-age=86400; SameSite=Lax`;
      }

      setResults(data);
      setAptitudeResults(data);
      setPhase('results');
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (err) {
      alert('Submission error: ' + err.message);
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }, [submitted, questions, answers, hintsUsed, setAptitudeResults]);
  
  useEffect(() => {
    if (phase === 'results' && results?.passed) {
      const timer = setTimeout(() => {
        window.location.href = '/student/coding';
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [phase, results]);

  useEffect(() => {
    if (isDisqualified && !submitted && phase === 'test') {
      toast.error("EXAM TERMINATED: Security protocol breached.", { duration: 6000, style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' } });
      handleSubmit(true);
    }
  }, [isDisqualified, submitted, phase, handleSubmit]);

  // Centralized proctoring handled by SecurityProvider

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const unsub = useInterviewStore.persist.onFinishHydration(() => setIsHydrated(true));
    if (useInterviewStore.persist.hasHydrated()) setIsHydrated(true);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!skills || skills.length === 0) {
      router.push('/student/resume');
    }
  }, [isHydrated, skills, router]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const handleStart = async () => {
    try {
      if (document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); setIsFullScreen(true); }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
    
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/aptitude/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ skills, totalQuestions: numQuestions })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate');
      
      setQuestions(data.questions || []);
      setTimeLimit(data.timeLimit || numQuestions * 60);
      setPhase('test');
      startTimeRef.current = Date.now();

      // Start Unified Security Session
      startSecurity({ 
        sessionId: 'assessment-aptitude-session', 
        round: 'aptitude',
        maxViolations: 5,
        maxCritical: 2
      });
    } catch (err) {
      alert('Failed to generate questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qId, optionIdx) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
    setShowHint(false);
  };

  const handleHint = () => {
    const q = questions[currentIdx];
    if (!hintsUsed[q.id]) setHintsUsed(prev => ({ ...prev, [q.id]: true }));
    setShowHint(true);
  };



  const q = questions[currentIdx];
  const answered = Object.keys(answers).length;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Skeleton height="80px" rounded="rounded-2xl" />
          <Skeleton height="250px" rounded="rounded-2xl" />
          <div className="space-y-3">
            <Skeleton height="50px" rounded="rounded-xl" />
            <Skeleton height="50px" rounded="rounded-xl" />
            <Skeleton height="50px" rounded="rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton height="200px" rounded="rounded-2xl" />
          <Skeleton height="50px" rounded="rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (phase === 'setup') return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
        <button 
          onClick={() => router.push('/student')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold mb-6 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-black mb-2 text-indigo-900">Aptitude Test Setup</h1>
        <p className="text-gray-500 mb-8">Configure your test. Proctoring will activate automatically.</p>

        <div className="mb-6">
          <label className="font-semibold text-gray-700 block mb-3">Number of Questions</label>
          <div className="flex items-center gap-4">
            <input type="range" min="5" max="50" value={numQuestions}
              onChange={e => setNumQuestions(Number(e.target.value))}
              className="flex-1 accent-orange-500" />
            <span className="text-2xl font-black w-12 text-center text-indigo-900">{numQuestions}</span>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-indigo-900 mb-1">Standard Corporate Aptitude</div>
              <div className="text-xs text-gray-600">Quantitative, Logical Reasoning, Verbal, & Data Interpretation</div>
            </div>
            <div className="text-2xl font-black text-indigo-900">{numQuestions} Questions</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ Proctoring Requirements</p>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• Camera & microphone access required</li>
            <li>• Tab switching is monitored and logged</li>
            <li>• Fullscreen mode will be enforced</li>
          </ul>
        </div>

        <button onClick={handleStart}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg bg-orange-500 hover:bg-orange-600">
          🚀 Start Test
        </button>
      </div>
    </div>
  );

  if (phase === 'results' && results) return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-lg p-8 text-center border border-gray-100">
        <div className="text-6xl mb-4">{results.passed ? '🎉' : '😞'}</div>
        <h2 className={`text-3xl font-black mb-2 ${results.passed ? 'text-green-500' : 'text-red-500'}`}>
          {results.passed ? 'Aptitude Round Passed!' : 'Aptitude Round Failed'}
        </h2>
        <p className="text-gray-500 mb-8">{results.message}</p>
        
        {results.passed && (
          <div className="mb-6 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700 animate-pulse">
            🚀 Promoting to Coding Round... Redirecting in 3 seconds.
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-gray-50">
            <div className="text-2xl font-black text-indigo-900">{results.score}/{results.maxScore}</div>
            <div className="text-xs text-gray-500">Score</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <div className="text-2xl font-black text-orange-500">{results.percentage}%</div>
            <div className="text-xs text-gray-500">Percentage</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <div className={`text-2xl font-black ${results.passed ? 'text-green-500' : 'text-red-500'}`}>
              {results.passed ? 'PASS' : 'FAIL'}
            </div>
            <div className="text-xs text-gray-500">Status</div>
          </div>
        </div>

        <div className="text-left max-h-64 overflow-y-auto mb-6 space-y-2">
          {(results.processedAnswers || []).map((a, i) => (
            <div key={i} className={`p-3 rounded-xl text-sm ${a.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                <span>{a.isCorrect ? '✅' : '❌'}</span>
                <span className="font-medium text-gray-700">Q{i + 1}</span>
                {a.usedHint && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">-0.5 hint</span>}
                <span className={`ml-auto font-bold ${a.isCorrect ? 'text-green-500' : 'text-red-500'}`}>+{a.score}</span>
              </div>
            </div>
          ))}
        </div>

        {results.passed ? (
          <button onClick={() => {
            window.location.href = '/student/coding';
          }}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg bg-indigo-900 hover:bg-indigo-800">
            Continue to Coding Round →
          </button>
        ) : (
          <div className="space-y-3">
            <button onClick={() => {
              // Complete reset for retest
              setPhase('setup');
              setResults(null);
              setSubmitted(false);
              setAnswers({});
              setHintsUsed({});
              setCurrentIdx(0);
              setShowHint(false);
              setLoading(false);
            }}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20">
              🔄 Retest Now
            </button>
            <button onClick={() => {
              window.location.href = '/student';
            }}
              className="w-full py-4 rounded-2xl text-gray-500 font-bold text-lg border-2 border-gray-100 hover:bg-gray-50 transition-all">
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 select-none">
      {phase === 'test' && <FaceDetection mode="floating" onViolation={handleAIViolation} />}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-700">Q {currentIdx + 1} / {questions.length}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{q?.difficulty}</span>
            </div>

            <div className="hidden md:flex items-center gap-4 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black">
               <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isFullScreen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-slate-500 uppercase tracking-tighter">AI Status</span>
               </div>
               <div className="w-px h-3 bg-slate-200" />
               <div className="text-slate-500 uppercase tracking-tighter">Violations: <span className={totalViolations > 0 ? 'text-red-500' : ''}>{totalViolations}/5</span></div>
            </div>

            <div className="flex items-center gap-3">
              <Timer totalSeconds={timeLimit} onTimeUp={handleSubmit} />
              <button onClick={toggleFullScreen} suppressHydrationWarning className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl px-6 py-3 shadow-sm border border-gray-100">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{answered} answered</span>
              <span>{questions.length - answered} remaining</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full bg-orange-500" animate={{ width: `${(answered / questions.length) * 100}%` }} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {q && (
              <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <p className="text-lg font-semibold text-gray-800 mb-6 leading-relaxed">{q.question}</p>
                <div className="space-y-3">
                  {(q.options || []).map((opt, i) => {
                    const selected = answers[q.id] === i;
                    const cleanOpt = opt.replace(/^[a-d][\.\)]\s*/i, '');
                    const label = String.fromCharCode(65 + i);
                    return (
                      <button key={i} onClick={() => handleAnswer(q.id, i)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium flex items-start gap-3 ${
                          selected ? 'bg-indigo-900 border-indigo-900 text-white shadow-md' : 'border-gray-200 hover:border-indigo-500 text-gray-700 hover:bg-gray-50'
                        }`}>
                        <span className={`font-bold ${selected ? 'text-indigo-200' : 'text-gray-400'}`}>{label})</span>
                        <span className="flex-1">{cleanOpt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <button onClick={handleHint}
                    className={`text-sm px-4 py-2 rounded-xl border transition-all ${
                      hintsUsed[q.id] ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600'
                    }`}>
                    💡 {hintsUsed[q.id] ? 'Hint used (-0.5)' : 'Show Hint (-0.5)'}
                  </button>
                </div>
                <AnimatePresence>
                  {showHint && q.hint && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 overflow-hidden">
                      💡 {q.hint}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <button onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setShowHint(false); }} disabled={currentIdx === 0}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold disabled:opacity-40 hover:border-gray-300 transition-all">
              ← Previous
            </button>
            {currentIdx < questions.length - 1 ? (
              <button onClick={() => { setCurrentIdx(i => i + 1); setShowHint(false); }}
                className="flex-1 py-3 rounded-xl text-white font-semibold transition-all bg-indigo-900">
                Next →
              </button>
            ) : (
              <button onClick={() => handleSubmit(false)} className="flex-1 py-3 rounded-xl text-white font-semibold bg-orange-500">
                Submit Test ✓
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <button onClick={() => handleSubmit(false)} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-orange-500 hover:bg-orange-600 transition-all">
            Submit Early
          </button>
        </div>
      </div>
    </div>
  );
}
