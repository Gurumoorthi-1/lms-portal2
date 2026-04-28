'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, ChevronLeft, Play, Send, Lightbulb, 
  CheckCircle2, XCircle, Timer, Zap, Target,
  Cpu, Rocket, BrainCircuit, Sparkles, Code
} from 'lucide-react';
import CodeEditor from '@/components/codelab/CodeEditor';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';


// Colors from xyzon-lms-reference
const COLORS = {
  orange: '#f97316',
  orangeLight: '#fb923c',
  orangeDark: '#ea6c00',
  orangeBg: '#fff7ed',
  navy: '#1e2a4a',
  navyMid: '#2d3d6b',
  bg: '#f8fafc',
  bg2: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  red: '#dc2626',
  redBg: '#fef2f2'
};

const LANG_COLORS = { javascript: '#eab308', python: '#2563eb', java: '#f97316' };
const LANG_LABELS  = { javascript: 'JS', python: 'PY', java: 'JAVA' };
const DIFF_COLORS  = { Easy: COLORS.green, Medium: '#ca8a04', Hard: COLORS.red };
const DIFF_BG      = { Easy: COLORS.greenBg, Medium: '#fefce8', Hard: COLORS.redBg };

export default function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState([]);
  const [solved, setSolved] = useState([]);
  const [selected, setSelected] = useState(null);
  const [code, setCode] = useState('');
  const [filter, setFilter] = useState('all');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [output, setOutput] = useState(null);
  const [review, setReview] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [successModal, setSuccessModal] = useState(null);

  const [totalViolations, setTotalViolations] = useState(0);
  const [fsViolations, setFsViolations] = useState(0);
  const [isTestStarted, setIsTestStarted] = useState(false);

  useEffect(() => {
    loadChallenges();
    loadProgress();
  }, []);

  async function loadChallenges() {
    try {
      const res = await fetch('/api/challenges');
      const data = await res.json();
      setChallenges(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load challenges');
    }
  }

  async function loadProgress() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/progress/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSolved((data.solvedChallenges || []).map(sc => sc.challengeId ?? sc));
      }
    } catch {}
  }

  function selectChallenge(c) {
    setSelected(c);
    setCode(c.starterCode || '');
    setOutput(null);
    setReview(null);
    setShowHint(false);
  }


  async function runCode() {
    if (!code.trim()) return toast.error('Write some code first!');
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch('/api/compiler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selected.language, code, input: '' }),
      });
      const data = await res.json();
      setOutput({ ...data, mode: 'run' });
      if (!data.success) toast.error('Check output for errors');
    } catch {
      toast.error('Server error');
    } finally {
      setRunning(false);
    }
  }

  async function submitChallenge() {
    if (!code.trim()) return toast.error('Write some code first!');
    const token = localStorage.getItem('token');
    if (!token) return toast.error('Please sign in to submit challenges!');
    setSubmitting(true);
    setOutput(null);
    try {
      const res = await fetch('/api/progress/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ challengeId: selected.id, code, language: selected.language }),
      });
      const data = await res.json();
      setOutput({ ...data, mode: 'submit' });

      if (data.passed) {
        setSolved(prev => [...new Set([...prev, selected.id])]);
        setSuccessModal({ challenge: selected, points: data.pointsEarned || 10 });
      } else {
        toast.error('Wrong answer — check your output!');
      }
    } catch (err) {
      toast.error('Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function getHint() {
    if (!code.trim()) return toast.error('Write some code first!');
    setReviewing(true);
    setReview(null);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: selected.language, challengeTitle: selected.title }),
      });
      const data = await res.json();
      setReview(data.review || `💡 Hint: ${selected.hint}`);
    } catch {
      setReview(`💡 Hint: ${selected.hint}`);
    } finally {
      setReviewing(false);
    }
  }

  const filtered = challenges.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'solved') return solved.includes(c.id);
    if (filter === 'unsolved') return !solved.includes(c.id);
    return c.language === filter || c.difficulty === filter;
  });

  const pct = challenges.length > 0 ? Math.round((solved.length / challenges.length) * 100) : 0;

  return (
    <div className="h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col overflow-hidden font-sans">
      
      {/* --- Reference Style Header --- */}
      <header className="bg-white border-b border-[#e2e8f0] py-3.5 px-6 flex items-center justify-between flex-shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/student" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f1f5f9] text-[#64748b] text-sm font-bold hover:bg-[#e2e8f0] transition-colors">
            <ChevronLeft size={16} /> Back
          </Link>
          <div className="w-px h-6 bg-[#e2e8f0]" />
          <div>
            <h1 className="text-xl font-extrabold text-[#1e2a4a] flex items-center gap-2">
              🏆 Challenges
            </h1>
            <p className="text-[11px] text-[#64748b] font-medium mt-0.5">
              50 challenges • JS, Python, Java • Auto-graded
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">

          <div className="flex items-center bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg overflow-hidden shrink-0">
            <div className="px-2.5 py-1 bg-white border-r border-[#e2e8f0]">
              <div className="text-[10px] font-black text-[#f97316] leading-tight font-mono">{solved.length * 10}</div>
              <div className="text-[7px] font-bold text-[#64748b] uppercase tracking-tighter">Points</div>
            </div>
            <div className="px-2.5 py-1">
              <div className="text-[10px] font-black text-[#1e2a4a] leading-tight font-mono">{solved.length}/50</div>
              <div className="text-[7px] font-bold text-[#64748b] uppercase tracking-tighter">Solved</div>
            </div>
          </div>
          <div className="w-px h-8 bg-[#e2e8f0]" />
          <Link 
            href="/codelab" 
            style={{
              padding: '8px 20px', borderRadius: 8, background: '#16a34a', color: 'white',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 2px 8px rgba(22,163,74,0.25)', transition: 'background 0.15s'
            }}
          >
            <span>✏️</span> Free Code Lab
          </Link>
          <button 
            style={{
              padding: '8px 20px', borderRadius: 8, background: '#1e2a4a', color: 'white',
              fontWeight: 700, fontSize: 13, border: 'none', cursor: 'default',
              display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 2px 8px rgba(30,42,74,0.18)'
            }}
          >
            <span>🏆</span> Challenges
          </button>
        </div>
      </header>

      {/* --- Reference Style Progress Bar --- */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Progress</span>
          <div className="flex-1 max-w-xl h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              className="h-full bg-gradient-to-r from-[#f97316] to-[#16a34a]"
              transition={{ duration: 1 }}
            />
          </div>
          <span className="text-xs font-bold text-[#64748b]">{solved.length} / 50</span>
        </div>
      </div>

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar: Challenge List (300px width as per reference) */}
        <aside className="w-[300px] bg-white border-r border-[#e2e8f0] flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b border-[#e2e8f0] flex flex-wrap gap-[5px]">
            {[
              { val: 'all', label: 'All' },
              { val: 'javascript', label: 'JS' },
              { val: 'python', label: 'Python' },
              { val: 'java', label: 'Java' },
              { val: 'Easy', label: 'Easy' },
              { val: 'Medium', label: 'Medium' },
              { val: 'Hard', label: 'Hard' },
              { val: 'solved', label: '✅ Solved' },
              { val: 'unsolved', label: '🔲 Todo' },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => setFilter(f.val)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: `1px solid ${filter === f.val ? '#f97316' : '#e2e8f0'}`,
                  background: filter === f.val ? '#fff7ed' : 'transparent',
                  color: filter === f.val ? '#c2410c' : '#64748b',
                }}
                className="transition-all active:scale-95"
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-[12px] custom-scrollbar bg-white">
            {filtered.map(c => {
              const isSolved = solved.includes(c.id);
              const isActive = selected?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => selectChallenge(c)}
                  style={{
                    padding: '10px 11px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    border: `1px solid ${isActive ? '#f97316' : isSolved ? '#bbf7d0' : '#e2e8f0'}`,
                    background: isActive ? '#fff7ed' : isSolved ? '#f0fdf4' : 'white',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '9px',
                  }}
                  className="cursor-pointer transition-all hover:border-[#cbd5e1]"
                >
                  <div 
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                      border: `2px solid ${isSolved ? '#22c55e' : '#e2e8f0'}`,
                      background: isSolved ? '#22c55e' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: 'white', fontWeight: 700,
                    }}
                  >
                    {isSolved ? '✓' : ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }} className="truncate">
                      {c.id}. {c.title}
                    </div>
                    <div className="flex gap-[5px] flex-wrap">
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: LANG_COLORS[c.language], background: `${LANG_COLORS[c.language]}22` }}>
                        {LANG_LABELS[c.language]}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: DIFF_BG[c.difficulty], color: DIFF_COLORS[c.difficulty] }}>
                        {c.difficulty}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }} className="font-bold">{c.category}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Content: Editor & Problem */}
        <main className="flex-1 flex flex-col min-w-0 relative bg-[#f8fafc]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="text-5xl mb-4">👈</div>
              <h2 className="text-xl font-extrabold text-[#1e2a4a]">Select a Challenge</h2>
              <p className="text-[#64748b] text-sm mt-2 max-w-xs">Choose one of the 50 challenges from the list to start coding.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Problem Description Panel */}
              <div className="p-6 bg-white border-b border-[#e2e8f0] flex-shrink-0 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-black text-[#1e2a4a] flex items-center gap-2">
                    {selected.id}. {selected.title}
                    {solved.includes(selected.id) && <span className="text-xs font-bold text-[#16a34a] ml-2 flex items-center gap-1"><CheckCircle2 size={14} /> Solved</span>}
                  </h2>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#f1f5f9] text-[#64748b] uppercase tracking-wider">{selected.category}</span>
                  </div>
                </div>
                <p className="text-sm text-[#475569] leading-relaxed mb-4">{selected.description}</p>
                
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="px-3 py-1.5 rounded-lg border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] text-xs font-bold hover:bg-[#ffedd5] transition-all flex items-center gap-2"
                >
                  <Lightbulb size={14} />
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
                
                <AnimatePresence>
                  {showHint && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-3.5 bg-[#fff7ed] border-l-4 border-[#f97316] rounded-r-xl"
                    >
                      <p className="text-xs text-[#475569] leading-relaxed italic">{selected.hint}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Editor Toolbar */}
              <div className="bg-white border-b border-[#e2e8f0] px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[selected.language] }} />
                  <span className="text-xs font-bold text-[#1e2a4a]">{selected.language.charAt(0).toUpperCase() + selected.language.slice(1)}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 font-bold uppercase tracking-tighter">Paste Restricted</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={getHint} disabled={reviewing} className="px-4 py-1.5 rounded-lg bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] text-xs font-bold hover:bg-[#ffedd5] transition-all disabled:opacity-50">
                    {reviewing ? 'Thinking...' : '🤖 AI Hint'}
                  </button>
                  <button onClick={runCode} disabled={running} className="px-4 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold hover:bg-[#1d4ed8] transition-all disabled:opacity-50 flex items-center gap-2">
                    <Play size={14} fill="currentColor" /> Run
                  </button>
                  <button onClick={submitChallenge} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-[#f97316] text-white text-xs font-bold hover:bg-[#ea580c] transition-all disabled:opacity-50 flex items-center gap-2">
                    <Send size={14} fill="currentColor" /> Submit
                  </button>
                </div>
              </div>

              {/* Code Editor with Reference Header Style */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#1e2a4a]">
                <div className="bg-[#1e2a4a] px-4 py-1.5 flex items-center gap-2 text-[10px] text-[#94a3b8] font-mono border-b border-[#2d3d6b]">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                  </div>
                  <span className="ml-2 font-bold text-[#e2e8f0]">solution.{selected.language === 'javascript' ? 'js' : selected.language === 'python' ? 'py' : 'java'}</span>
                </div>
                <div className="flex-1 relative">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={selected.language}
                    blockPaste={true}
                  />
                </div>
              </div>

              {/* Console Output Panel */}
              <AnimatePresence>
                {(output || review) && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="bg-white border-t border-[#e2e8f0] flex-shrink-0"
                  >
                    <div className="px-4 py-2 border-b border-[#e2e8f0] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-[#64748b] tracking-wider">
                          {output?.mode === 'submit' ? 'Submission Result' : 'Console Output'}
                        </span>
                        {output && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            (output.passed || output.success) ? 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]' : 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]'
                          }`}>
                            {output.mode === 'submit' ? (output.passed ? 'PASSED' : 'FAILED') : (output.success ? 'SUCCESS' : 'ERROR')}
                          </span>
                        )}
                      </div>
                      <button onClick={() => { setOutput(null); setReview(null); }} className="text-[#94a3b8] hover:text-[#0f172a]">
                        <XCircle size={18} />
                      </button>
                    </div>
                    <pre className="p-4 font-mono text-[11px] leading-relaxed text-[#0f172a] bg-[#f8fafc] overflow-y-auto max-h-40 whitespace-pre-wrap">
                      {output?.output || output?.error || review || '(no output)'}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* --- Reference Style Success Modal --- */}
      <AnimatePresence>
        {successModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1e2a4a]/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl border border-[#bbf7d0]"
            >
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-black text-[#16a34a] mb-2 uppercase tracking-tight">Challenge Complete!</h2>
              <p className="text-[#64748b] text-sm mb-6 leading-relaxed">
                You solved <span className="text-[#0f172a] font-bold">{successModal.challenge.title}</span>! Your logic is sharpening.
              </p>
              
              <div className="inline-block px-4 py-2 rounded-full bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] font-black text-sm mb-8">
                + {successModal.points} Points Earned 🌟
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setSuccessModal(null);
                    const idx = challenges.findIndex(c => c.id === selected.id);
                    if (idx < challenges.length - 1) selectChallenge(challenges[idx + 1]);
                  }}
                  className="flex-1 py-3 bg-[#f97316] text-white rounded-xl text-xs font-bold hover:bg-[#ea580c] transition-all shadow-lg shadow-orange-500/20"
                >
                  Next Challenge →
                </button>
                <button 
                  onClick={() => setSuccessModal(null)}
                  className="px-5 py-3 border border-[#e2e8f0] text-[#64748b] rounded-xl text-xs font-bold hover:bg-[#f1f5f9] transition-all"
                >
                  Stay Here
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
