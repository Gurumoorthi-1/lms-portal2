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

const FaceDetection = dynamic(() => import('@/components/exam/FaceDetection'), { ssr: false });


const DIFF_COLORS = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
const LANG_LABELS = { javascript: 'JavaScript', python: 'Python', java: 'Java', cpp: 'C++' };

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

  const [totalViolations, setTotalViolations] = useState(0);
  const [fsViolations, setFsViolations] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const lastViolationRef = useRef(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const pageLoadTimeRef = useRef(Date.now());

  const handleViolation = useCallback(async (reason, severity = 'warning', type = 'general') => {
    const now = Date.now();
    if (now - lastViolationRef.current < 3000) return;

    // Ignore blur violations during first 15s of page load (permission popups)
    if (type === 'tab_switch' && reason === 'Window lost focus') {
      if (now - pageLoadTimeRef.current < 15000) return;
    }

    lastViolationRef.current = now;

    const isFullScreenExit = type === 'screen_exit';

    if (isFullScreenExit) {
      setFsViolations(prev => {
        const newCount = prev + 1;
        toast.error(`Security Alert: ${reason}. Final warning!`, { id: 'security_alert', duration: 5000, icon: '⚠️', style: { border: '2px solid #ef4444', background: '#0f172a', color: '#fff' } });
        return newCount;
      });
    } else {
      setTotalViolations(prev => {
        const newCount = prev + 1;
        toast.error(`Security Alert: ${reason}. Violation ${newCount}/5`, { id: 'security_alert', duration: 5000, icon: '🛡️', style: { border: '2px solid #ef4444', background: '#0f172a', color: '#fff' } });
        return newCount;
      });
    }
  }, []);

  useEffect(() => {
    if (totalViolations >= 5 || fsViolations >= 2) {
      if (!isDisqualified) {
        toast.error("TEST TERMINATED: Security protocol breached.", { duration: 6000, style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' } });
        setIsDisqualified(true);
      }
    }
  }, [totalViolations, fsViolations, isDisqualified]);

  useEffect(() => {
    if (isDisqualified) return;

    const handleVisibilityChange = () => {
      if (document.hidden) handleViolation("Tab switching detected", "severe", "tab_switch");
    };
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullScreen(false);
        handleViolation("Exited full-screen mode", "severe", "screen_exit");
        setTimeout(() => {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(()=> {
              handleViolation("Refused full-screen mode", "severe", "screen_exit");
            });
          }
        }, 2000);
      } else {
        setIsFullScreen(true);
      }
    };

    const handleBlur = () => {
      handleViolation("Window lost focus", "severe", "tab_switch");
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleViolation, isDisqualified]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    if (!skills || skills.length === 0) {
      router.push('/student/resume');
      return;
    }
    
    // Auto detect language from skills
    let lang = 'javascript';
    const skillsLower = skills.join(' ').toLowerCase();
    if (skillsLower.includes('python')) lang = 'python';
    else if (skillsLower.includes('java ') || skillsLower === 'java') lang = 'java';
    else if (skillsLower.includes('c++') || skillsLower.includes('cpp')) lang = 'cpp';
    
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
        const res = await fetch('http://localhost:5001/challenges/generate-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: ctx, language: lang })
        });
        const data = await res.json();
        
        if (data && Array.isArray(data)) {
          setProblems(data);
          const starter = data[0]?.starterCode?.[lang] || '';
          setCode(starter);
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullScreen(true);
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

  const handleRun = async () => {
    if (!activeProblem || !code.trim()) return;
    setRunning(true);
    setRunResults(null);
    try {
      const res = await fetch('http://localhost:5001/compiler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: detectedLanguage, code, input: '' })
      });
      const data = await res.json();
      setRunResults({ ...data, type: 'run', passed: data.success });
    } catch (err) {
      setRunResults({ error: err.message, type: 'run' });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeProblem || !code.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5001/challenges/evaluate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: activeProblem, language: detectedLanguage, code })
      });
      const data = await res.json();
      setSubmissions(prev => ({ ...prev, [activeProblem.id]: data }));
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
    router.push('/student/interview');
  };

  const solvedCount = Object.values(submissions).filter(s => s.passed).length;

  useEffect(() => {
    const triggerFS = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    if (!loading) triggerFS();
  }, [loading]);
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
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white select-none overflow-hidden">
      {!isDisqualified && <FaceDetection mode="floating" onViolation={handleViolation} />}
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
             <div className="text-gray-400 uppercase tracking-tighter whitespace-nowrap">FS: <span className={fsViolations > 0 ? 'text-red-500' : ''}>{fsViolations}/2</span></div>
             <div className="w-px h-3 bg-gray-700" />
             <div className="text-gray-400 uppercase tracking-tighter whitespace-nowrap">Violations: <span className={totalViolations > 0 ? 'text-red-500' : ''}>{totalViolations}/5</span></div>
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

              <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                <p className="text-xs font-bold text-blue-400 mb-2">CONSTRAINTS</p>
                {(activeProblem.constraints || []).map((c, i) => (
                  <p key={i} className="text-xs text-gray-400 font-mono">• {c}</p>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
              <div className="bg-gray-800 px-4 py-2 flex items-center justify-end gap-2 border-b border-gray-700">
                <button onClick={handleRun} disabled={running || submitting}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-gray-600 hover:bg-gray-500 disabled:opacity-40">
                  {running ? '⏳ Running...' : '▶ Run'}
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

              <div className="flex-1 overflow-hidden" style={{ minHeight: '300px' }}>
                <CodeEditor value={code} onChange={v => setCode(v)} language={detectedLanguage} blockPaste={true} />
              </div>

              <AnimatePresence>
                {runResults && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-700 bg-gray-900 overflow-y-auto" style={{ maxHeight: '200px' }}>
                    <div className="p-4">
                      {runResults.error ? (
                        <div className="text-red-400 text-sm font-mono">{runResults.error}</div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`font-bold text-sm ${runResults.passed ? 'text-green-400' : 'text-red-400'}`}>
                              {runResults.type === 'submit'
                                ? `${runResults.passed ? '✅ Accepted' : '❌ Failed'} — AI Evaluated`
                                : `${runResults.success ? '✅ Run Success' : '❌ Run Error'}`}
                            </span>
                          </div>
                          {runResults.type === 'submit' && (
                            <p className="text-gray-300 text-sm">{runResults.feedback}</p>
                          )}
                          {runResults.type === 'run' && (
                            <pre className="text-xs text-gray-300 font-mono">{runResults.output || runResults.message || 'No output'}</pre>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
