'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterviewStore } from '@/hooks/useInterviewStore';
import Skeleton from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import CodeEditor from '@/components/codelab/CodeEditor';
import { ArrowLeft, ShieldAlert, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { useSecurity } from '@/components/providers/SecurityProvider';
import { authFetch, BASE_URL } from '@/lib/api';

const FaceDetection = dynamic(() => import('@/components/exam/FaceDetection'), { ssr: false });


const DIFF_COLORS = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
const LANG_LABELS = { javascript: 'JavaScript', python: 'Python', java: 'Java', cpp: 'C++' };
const API_BASE = BASE_URL;

export default function CodingPage() {
  const router = useRouter();
  const { resumeData, skills, setCodingResults } = useInterviewStore();
  const [problems, setProblems] = useState([]);
  const [activeProbIdx, setActiveProbIdx] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [showGate, setShowGate] = useState(true);

  // Security Orchestrator
  const { 
    totalViolations, 
    isDisqualified, 
    startSecurity, 
    reportViolation,
    config: securityConfig
  } = useSecurity();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [tabSwitchTimer, setTabSwitchTimer] = useState(null);
  const [awayTime, setAwayTime] = useState(0);
  const pageLoadTimeRef = useRef(Date.now());

  // Handle specialized AI violations from components
  const handleAIViolation = useCallback((reason, severity = 'warning', type = 'ai_alert') => {
    reportViolation(type, reason, severity);
  }, [reportViolation]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand hydration
    const unsub = useInterviewStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    
    // Check if already hydrated
    if (useInterviewStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    if (!skills || skills.length === 0) {
      router.push('/student/resume');
      return;
    }
    
    // Improved auto detection language from skills
    const getPreferredLanguage = (userSkills) => {
      const priorities = ['python', 'java', 'cpp', 'javascript', 'typescript'];
      const skillsLower = userSkills.map(s => s.toLowerCase());
      return priorities.find(p => skillsLower.some(s => s.includes(p))) || 'javascript';
    };
    
    const lang = getPreferredLanguage(skills);
    setDetectedLanguage(lang);

    (async () => {
      try {
        const ctx = {
          skills: skills.join(', '),
          technologies: '',
          experience: resumeData?.experience?.join('; ') || '',
          projects: '',
          resumeText: resumeData?.summary || ''
        };
        const res = await fetch(`${API_BASE}/challenges/generate-ai`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ context: ctx, language: lang })
        });
        const data = await res.json();
        
        if (data && Array.isArray(data)) {
          setProblems(data);
          const starter = data[0]?.starterCode?.[lang] || '';
          setCode(starter);
          
          // Start Unified Security Session
          startSecurity({ 
            sessionId: 'assessment-coding-session', 
            round: 'coding',
            maxViolations: 3,
            maxCritical: 2
          });

          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          throw new Error('Invalid format returned from AI');
        }
      } catch (err) {
        alert('Failed to load problems: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [skills, resumeData, router]);

  const activeProblem = problems[activeProbIdx];

  const selectProblem = (idx) => {
    setActiveProbIdx(idx);
    setRunResults(null);
    const starter = problems[idx]?.starterCode?.[detectedLanguage] || '';
    setCode(starter);
  };

  const [customInput, setCustomInput] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [terminalTab, setTerminalTab] = useState('results'); // 'results' | 'custom'

  const handleRunCustom = async () => {
    if (!activeProblem || !code.trim()) return;
    setRunning(true);
    setRunResults(null);
    setTerminalTab('results');
    try {
      const res = await fetch(`${API_BASE}/compiler/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: detectedLanguage, code, input_data: customInput })
      });
      const data = await res.json();
      setRunResults({ ...data, type: 'run', passed: data.success });
    } catch (err) {
      setRunResults({ error: err.message, type: 'run' });
    } finally {
      setRunning(false);
    }
  };

  const handleRunAllTests = async () => {
    if (!activeProblem || !code.trim()) return;
    setRunning(true);
    setTestResults(null);
    setTerminalTab('results');
    try {
      const tcs = (activeProblem.testCases || []).slice(0, 5); // Ensure 5 test cases
      const res = await fetch(`${API_BASE}/challenges/submit-tests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          problemId: activeProblem.id, 
          language: detectedLanguage, 
          code, 
          testCases: tcs 
        })
      });
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      toast.error('Test execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeProblem || !code.trim()) return;
    setSubmitting(true);
    try {
      // First run all tests to get the most accurate data
      const tcs = (activeProblem.testCases || []).slice(0, 5);
      const testRes = await fetch(`${API_BASE}/challenges/submit-tests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ problemId: activeProblem.id, language: detectedLanguage, code, testCases: tcs })
      });
      const testData = await testRes.json();
      setTestResults(testData);

      // Then call the AI evaluation for feedback
      const res = await fetch(`${API_BASE}/challenges/evaluate-ai`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ problem: activeProblem, language: detectedLanguage, code })
      });
      const data = await res.json();

      if (data.newToken) {
        localStorage.setItem('token', data.newToken);
        document.cookie = `token=${data.newToken}; path=/; max-age=86400; SameSite=Lax`;
        toast.success('Coding challenge accepted!');
      }

      setSubmissions(prev => ({ ...prev, [activeProblem.id]: { ...data, ...testData } }));
      setRunResults({ ...data, type: 'submit' });
    } catch (err) {
      setRunResults({ error: err.message, type: 'submit' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setCodingResults(submissions);
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    
    try {
      // Force promotion to HR Interview stage to ensure token is synced
      // Pass fromStage to prevent double-promotion if already promoted via handleSubmit
      const res = await fetch(`${API_BASE}/progress/next-stage`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ fromStage: 'CODING' })
      });
      const data = await res.json();
      if (data.newToken) {
        localStorage.setItem('token', data.newToken);
        document.cookie = `token=${data.newToken}; path=/; max-age=86400; SameSite=Lax`;
      }
    } catch (err) {
      console.error('Failed to sync stage before navigation:', err);
    }
    
    // Force location change for testing/production reliability
    window.location.href = '/student/interview';
  };

  // ── Tab Switch Termination Logic (15s Cumulative) ──
  const [accumulatedAwayTime, setAccumulatedAwayTime] = useState(0);
  const awayTimerRef = useRef(null);
  
  useEffect(() => {
    if (showGate || isDisqualified || loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden || !document.hasFocus()) {
        if (!awayTimerRef.current) {
          awayTimerRef.current = setInterval(() => {
            setAccumulatedAwayTime(prev => {
              const newVal = prev + 1;
              if (newVal >= 15) {
                clearInterval(awayTimerRef.current);
                awayTimerRef.current = null;
                reportViolation('tab_switch_timeout', 'Session terminated: Left assessment for > 15 cumulative seconds.', 'critical');
              }
              return newVal;
            });
          }, 1000);
        }
      } else {
        if (awayTimerRef.current) {
          clearInterval(awayTimerRef.current);
          awayTimerRef.current = null;
        }
      }
    };

    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (awayTimerRef.current) {
        clearInterval(awayTimerRef.current);
        awayTimerRef.current = null;
      }
    };
  }, [showGate, isDisqualified, loading, reportViolation]);

  const solvedCount = Object.values(submissions).filter(s => s.passed).length;

  useEffect(() => {
    const triggerFS = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    // Removed direct loading effect to use Gate instead
  }, [loading]);

  const enterProctoredSession = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      }
      setShowGate(false);
      toast.success("AI Security System: ONLINE");
    } catch (err) {
      setShowGate(false); // Fallback if FS fails
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      <div className="bg-gray-800 h-14 border-b border-gray-700 px-4 flex items-center gap-3 shrink-0">
        <Skeleton width="150px" height="30px" className="bg-gray-700" />
        <Skeleton width="150px" height="30px" className="bg-gray-700" />
        <Skeleton width="150px" height="30px" className="bg-gray-700 ml-auto" />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-5/12 border-r border-gray-700 bg-gray-900 p-5 space-y-4">
          <Skeleton height="40px" className="bg-gray-800" />
          <Skeleton height="20px" width="60%" className="bg-gray-800" />
          <Skeleton height="200px" className="bg-gray-800" />
          <Skeleton height="100px" className="bg-gray-800" />
        </div>
        <div className="flex-1 bg-gray-950 p-4 space-y-4">
          <Skeleton height="100%" className="bg-gray-900" />
        </div>
      </div>
    </div>
  );

  if (showGate) {
    return (
      <div className="h-screen bg-[#0F172A] flex items-center justify-center p-6 select-none">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl w-full bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl text-center space-y-8">
          <div className="w-20 h-20 bg-orange-500/10 text-orange-400 rounded-3xl flex items-center justify-center mx-auto border border-orange-500/20">
            <Maximize2 size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">Coding Assessment Gate</h1>
            <p className="text-slate-400 font-medium text-sm px-6">Entering the proctored coding environment requires full-screen mode for security and violation tracking.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
             <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Security Status</div>
                <div className="text-sm font-bold text-emerald-400">System Ready</div>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Constraint</div>
                <div className="text-sm font-bold text-white">Full-Screen Required</div>
             </div>
          </div>

          <button 
            onClick={enterProctoredSession}
            className="w-full h-16 rounded-[24px] font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/40"
          >
            Enter Proctored Session <ArrowLeft size={24} className="rotate-180" />
          </button>
          
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Clicking will trigger Full-Screen Mode</p>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white select-none overflow-hidden">
      {!isDisqualified && <FaceDetection mode="floating" onViolation={handleAIViolation} />}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-1.5 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={() => router.push('/student')}
            suppressHydrationWarning
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-all group shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex gap-1.5 overflow-x-auto min-w-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {problems.map((p, i) => {
              const sub = submissions[p.id];
              return (
                <button key={p.id} onClick={() => selectProblem(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                    i === activeProbIdx ? 'bg-gray-700 border-orange-500' : 'bg-gray-800 border-gray-600 hover:border-gray-400'
                  }`}>
                  <span style={{ color: sub ? (sub.passed ? '#10b981' : '#ef4444') : DIFF_COLORS[p.difficulty] }}>
                    {sub ? (sub.passed ? '✓' : '✗') : '○'}
                  </span>
                  {p.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
           <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-xl text-[10px] font-black">
             <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isFullScreen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-gray-400 uppercase tracking-tighter whitespace-nowrap">AI Status</span>
             </div>
             <div className="w-px h-3 bg-gray-700" />
             <div className="text-gray-400 uppercase tracking-tighter whitespace-nowrap">Violations: <span className={totalViolations > 0 ? 'text-red-500' : ''}>{totalViolations}/3</span></div>
             {accumulatedAwayTime > 0 && (
               <>
                 <div className="w-px h-3 bg-gray-700" />
                 <div className="text-rose-500 font-black uppercase tracking-tighter animate-pulse">TERMINATING IN: {15 - accumulatedAwayTime}s</div>
               </>
             )}
          </div>

          <button onClick={toggleFullScreen} suppressHydrationWarning className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors">
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          
          <div className="flex items-center bg-gray-900/80 border border-gray-700 rounded-lg shrink-0">
            <div className="px-3 py-1.5 bg-blue-900/40 border-r border-gray-700">
              <span className="text-blue-300 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{LANG_LABELS[detectedLanguage] || detectedLanguage}</span>
            </div>
            <div className="px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-white text-[11px] font-black">{solvedCount}/{problems.length}</span>
              <span className="text-gray-400 text-[11px] font-black uppercase tracking-widest">SOLVED</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {activeProblem && (
          <>
            <div className="w-5/12 border-r border-gray-700 bg-gray-900 overflow-y-auto p-5" style={{ minWidth: '340px' }}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-black text-white">{activeProblem.title}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ background: DIFF_COLORS[activeProblem.difficulty] }}>
                  {activeProblem.difficulty}
                </span>
              </div>

              {activeProblem.resumeRelevance && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-blue-900/30 border border-blue-700/50">
                  <p className="text-xs text-blue-300"><span className="font-bold">📋 Resume relevance: </span>{activeProblem.resumeRelevance}</p>
                </div>
              )}

              <div className="flex gap-1.5 flex-wrap mb-4">
                {(activeProblem.tags || []).map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{tag}</span>
                ))}
              </div>

              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line mb-6">{activeProblem.description}</p>

              <div className="space-y-3 mb-6">
                {(activeProblem.examples || []).map((ex, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-800 border border-gray-700">
                    <p className="text-xs font-bold text-gray-400 mb-2">EXAMPLE {i + 1}</p>
                    <div className="font-mono text-sm space-y-1">
                      <p><span className="text-gray-400">Input:</span> <span className="text-green-300">{ex.input}</span></p>
                      <p><span className="text-gray-400">Output:</span> <span className="text-yellow-300">{ex.output}</span></p>
                      {ex.explanation && <p className="text-xs text-gray-500 mt-1 pt-1 border-t border-gray-700">💡 {ex.explanation}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 mb-6">
                <p className="text-xs font-bold text-blue-400 mb-2">CONSTRAINTS</p>
                {(activeProblem.constraints || []).map((c, i) => (
                  <p key={i} className="text-xs text-gray-400 font-mono">• {c}</p>
                ))}
              </div>

              {/* NEW: Side-bar Test Cases */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Test Cases (5)</h3>
                 </div>
                 <div className="space-y-3">
                    {(activeProblem.testCases || []).map((tc, i) => (
                       <div key={i} className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-black text-gray-500 uppercase">Case {i + 1}</span>
                             <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                tc.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-500' :
                                tc.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                             }`}>
                                {tc.difficulty || 'easy'}
                             </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                             <div>
                                <div className="text-gray-600 mb-1">INPUT</div>
                                <div className="text-gray-300 truncate" title={tc.input}>{tc.input}</div>
                             </div>
                             <div>
                                <div className="text-gray-600 mb-1">EXPECTED</div>
                                <div className="text-emerald-500 truncate" title={tc.expectedOutput}>{tc.expectedOutput}</div>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
              <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTerminalTab('results')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${terminalTab === 'results' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Terminal & Results
                  </button>
                  <button 
                    onClick={() => setTerminalTab('custom')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${terminalTab === 'custom' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Custom Input
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleRunCustom} disabled={running || submitting}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-gray-600 hover:bg-gray-500 disabled:opacity-40">
                    {running ? '⏳ Running...' : '▶ Run Code'}
                  </button>
                  <button onClick={handleRunAllTests} disabled={running || submitting}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40">
                    Run All Tests
                  </button>
                  <button onClick={handleSubmit} disabled={running || submitting}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-orange-500 disabled:opacity-40">
                    {submitting ? '⏳ Submitting...' : '✓ Submit AI Eval'}
                  </button>
                  <div className="w-px h-4 bg-gray-700 mx-1" />
                  <button onClick={handleComplete}
                    className="px-4 py-1.5 rounded-lg text-white text-sm font-bold bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20">
                    Finish Round →
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: '300px' }}>
                <div className="flex-1 overflow-hidden">
                  <CodeEditor value={code} onChange={v => setCode(v)} language={detectedLanguage} blockPaste={true} />
                </div>

                {terminalTab === 'custom' && (
                  <div className="h-40 bg-gray-900 border-t border-gray-700 p-4 flex flex-col">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Manual Input Data</label>
                    <textarea 
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter input values here (e.g. 5, 10)..."
                      className="flex-1 bg-gray-800 text-white font-mono text-sm p-3 rounded-lg border border-gray-700 focus:border-orange-500 outline-none resize-none"
                    />
                  </div>
                )}

                <AnimatePresence>
                  {(runResults || testResults) && terminalTab === 'results' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-700 bg-gray-900 overflow-y-auto" style={{ maxHeight: '250px' }}>
                      <div className="p-4 space-y-4">
                        {/* Test Case Suite Results */}
                        {testResults && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Test Suite Results ({testResults.passedCount}/{testResults.totalCount})</h3>
                               <span className={`text-xs font-bold ${testResults.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {testResults.passed ? 'OVERALL PASS' : 'OVERALL FAIL'}
                               </span>
                            </div>
                            <div className="grid gap-2">
                              {(testResults.results || []).map((tr, i) => (
                                <div key={i} className={`p-3 rounded-xl border ${tr.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                   <div className="flex items-center gap-2 mb-2">
                                      <div className={`w-2 h-2 rounded-full ${tr.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                      <span className="text-xs font-bold text-white">Test Case {i + 1}</span>
                                      <span className={`text-[10px] font-black uppercase ml-auto ${tr.passed ? 'text-emerald-400' : 'text-rose-400'}`}>{tr.passed ? 'Passed' : 'Failed'}</span>
                                   </div>
                                   <div className="grid grid-cols-3 gap-4 font-mono text-[11px]">
                                      <div><div className="text-gray-500 mb-1">Input</div><div className="text-gray-300 bg-black/30 p-1.5 rounded">{tr.input || 'N/A'}</div></div>
                                      <div><div className="text-gray-500 mb-1">Expected</div><div className="text-emerald-300 bg-black/30 p-1.5 rounded">{tr.expectedOutput}</div></div>
                                      <div><div className="text-gray-500 mb-1">Actual</div><div className={`${tr.passed ? 'text-emerald-300' : 'text-rose-300'} bg-black/30 p-1.5 rounded`}>{tr.actualOutput}</div></div>
                                   </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Individual Run/Submit AI Results */}
                        {runResults && (
                          <div className="pt-2 border-t border-gray-800">
                            {runResults.error ? (
                              <div className="text-red-400 text-sm font-mono p-2 bg-red-900/10 rounded-lg border border-red-900/20">{runResults.error}</div>
                            ) : (
                              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={`font-black text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${runResults.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {runResults.type === 'submit' ? 'AI Evaluation' : 'Code Execution'}
                                  </span>
                                  <span className={`font-bold text-sm ${runResults.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {runResults.type === 'submit'
                                      ? (runResults.passed ? '✓ Solution Accepted' : '✗ Solution Rejected')
                                      : (runResults.success ? '✓ Successfully Ran' : '✗ Execution Failed')}
                                  </span>
                                </div>
                                {runResults.type === 'submit' && (
                                  <p className="text-gray-300 text-xs leading-relaxed mt-2 italic">"{runResults.feedback}"</p>
                                )}
                                {runResults.type === 'run' && (
                                  <pre className="text-xs text-gray-300 font-mono bg-black/40 p-3 rounded-lg mt-2 overflow-x-auto">{runResults.output || runResults.message || 'No output'}</pre>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isDisqualified} onClose={() => router.push('/student')} showClose={false} className="bg-rose-950 border-rose-500">
         <div className="text-center p-6 space-y-4">
           <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
             <ShieldAlert size={40} />
           </div>
           <h2 className="text-3xl font-black text-rose-500 uppercase tracking-widest">Disqualified</h2>
           <p className="text-rose-200 font-bold text-lg">Your session has been terminated due to repeated security protocol breaches.</p>
           <button onClick={() => window.location.href = '/student'} className="w-full h-14 bg-rose-600 text-white rounded-xl font-black mt-4 hover:bg-rose-500 transition-all">Exit Assessment</button>
         </div>
      </Modal>
    </div>
  );
}
