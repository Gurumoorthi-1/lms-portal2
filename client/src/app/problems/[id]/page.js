'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Play, Send, Info, Lightbulb, FileText, CheckCircle2, XCircle, AlertCircle, Timer, Monitor } from 'lucide-react';
import CodeEditor from '@/components/codelab/CodeEditor';
import toast from 'react-hot-toast';
import Link from 'next/link';

const LANG_COLORS = { javascript: '#F7DF1E', python: '#3776AB', java: '#ED8B00', cpp: '#00599C', html: '#E34F26', css: '#1572B6', bash: '#4EAA25', yaml: '#CB171E' };

export default function ProblemEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [activeTab, setActiveTab] = useState('description');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [outputTab, setOutputTab] = useState('output');

  useEffect(() => {
    fetch(`/api/problems/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setProblem(data);
        setLanguage(data.language || 'javascript');
        const starter = data.starterCode ? (data.starterCode[data.language] || data.starterCode.get?.(data.language)) : '';
        setCode(starter || '');
      })
      .catch(err => toast.error('Failed to load problem'));
  }, [params.id]);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setOutputTab('output');
    try {
      const res = await fetch('/api/compiler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code, input: problem.examples?.[0]?.input || '' })
      });
      const data = await res.json();
      setResult({ ...data, type: 'run' });
    } catch (err) {
      toast.error('Execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    if (!token) return toast.error('Login required for submission');

    setSubmitting(true);
    setResult(null);
    setOutputTab('result');
    try {
      const res = await fetch(`/api/problems/${params.id}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code, language })
      });
      const data = await res.json();
      setResult({ ...data, type: 'submit' });
      if (data.status === 'Accepted') {
        toast.success('Accepted! You earned 10 XP');
      } else {
        toast.error(`Rejected: ${data.status}`);
      }
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!problem) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      {/* Navbar */}
      <header className="h-14 border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-md flex items-center px-6 gap-6 shrink-0">
        <Link 
          href={slug ? `/courses/${slug}` : (problem.topicId ? `/problems?topicId=${problem.topicId}` : "/student")} 
          className="p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-400" />
        </Link>
        <div className="w-px h-6 bg-white/10" />
        <h1 className="text-sm font-black tracking-tight">{problem.title}</h1>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter bg-white/5 ${
            problem.difficulty === 'Easy' ? 'text-emerald-400' : problem.difficulty === 'Medium' ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {problem.difficulty}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={handleRun} 
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {running ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play size={14} className="text-emerald-500" />}
            Run
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-50 text-white hover:text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            {submitting ? <div className="w-3 h-3 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" /> : <Send size={14} />}
            Submit
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Description */}
        <div className="w-[450px] border-r border-white/5 flex flex-col bg-[#0F172A]/30">
          <div className="flex border-b border-white/5 shrink-0 px-2">
            {[
              { id: 'description', icon: FileText, label: 'Problem' },
              { id: 'hints', icon: Lightbulb, label: 'Hints' },
              { id: 'examples', icon: Info, label: 'Examples' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                  activeTab === tab.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {activeTab === tab.id && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="text-slate-300 leading-relaxed text-[15px] whitespace-pre-wrap">
                      {problem.description}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-4">
                    {problem.tags?.map(tag => (
                      <span key={tag} className="text-[10px] font-black px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-500 uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'hints' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {problem.hints?.map((hint, idx) => (
                    <div key={idx} className="bg-amber-400/5 border border-amber-400/10 rounded-2xl p-4 flex gap-4">
                      <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0">
                        <Lightbulb size={16} className="text-amber-400" />
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed italic">"{hint}"</p>
                    </div>
                  ))}
                  {(!problem.hints || problem.hints.length === 0) && <p className="text-slate-500 text-sm">No hints available yet.</p>}
                </motion.div>
              )}

              {activeTab === 'examples' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  {problem.examples?.map((ex, idx) => (
                    <div key={idx} className="space-y-3">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Example {idx + 1}</h4>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter mb-2">Input</p>
                          <pre className="bg-black/40 p-3 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">{ex.input || 'N/A'}</pre>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter mb-2">Expected Output</p>
                          <pre className="bg-black/40 p-3 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">{ex.output}</pre>
                        </div>
                        {ex.explanation && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">Explanation</p>
                            <p className="text-xs text-slate-400 leading-relaxed italic">{ex.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Editor & Output */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#020617]">
          {/* Editor Header */}
          <div className="h-10 bg-[#0F172A]/50 border-b border-white/5 flex items-center px-4 justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[language] }} />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{language}</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black text-slate-600 uppercase tracking-tighter">
              <span className="flex items-center gap-1"><Monitor size={10} /> Auto-save ON</span>
              <span className="flex items-center gap-1"><AlertCircle size={10} /> Read-only test cases</span>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 overflow-hidden relative">
            <CodeEditor 
              value={code} 
              onChange={setCode} 
              language={language}
              blockPaste={true} 
            />
          </div>

          {/* Output Terminal */}
          <div className="h-64 border-t border-white/5 bg-[#0F172A]/50 flex flex-col shrink-0 overflow-hidden">
            <div className="flex border-b border-white/5 shrink-0">
              {['output', 'result', 'history'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setOutputTab(tab)}
                  className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                    outputTab === tab ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {tab === 'output' ? 'Output Console' : tab === 'result' ? 'Submission Result' : 'History'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
              {outputTab === 'output' && (
                <div className="space-y-3">
                  {!result && !running && <div className="text-slate-700 italic">No output yet. Run your code to see the results here.</div>}
                  {running && <div className="text-blue-400 flex items-center gap-2"><div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Compiling & Executing...</div>}
                  {result?.type === 'run' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                        <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[10px] ${result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {result.success ? 'Success' : 'Failed'}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1"><Timer size={12} /> {result.execTime}ms</span>
                      </div>
                      {result.output && (
                        <div className="space-y-1">
                          <p className="text-slate-600 uppercase text-[9px] font-bold">Standard Output:</p>
                          <pre className="text-slate-300 bg-white/5 p-3 rounded-xl whitespace-pre-wrap">{result.output}</pre>
                        </div>
                      )}
                      {result.error && (
                        <div className="space-y-1">
                          <p className="text-rose-900 uppercase text-[9px] font-bold">Error Stream:</p>
                          <pre className="text-rose-400 bg-rose-400/5 p-3 rounded-xl whitespace-pre-wrap border border-rose-400/10">{result.error}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {outputTab === 'result' && (
                <div className="space-y-3">
                  {!result && !submitting && <div className="text-slate-700 italic">Your submission report will appear here after clicking 'Submit'.</div>}
                  {submitting && <div className="text-emerald-400 flex items-center gap-2"><div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Verifying all test cases...</div>}
                  {result?.type === 'submit' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        {result.status === 'Accepted' ? <CheckCircle2 size={120} /> : <XCircle size={120} />}
                      </div>
                      
                      <div className="relative z-10">
                        <div className={`text-2xl font-black mb-1 flex items-center gap-3 ${result.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {result.status === 'Accepted' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                          {result.status}
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Submission ID: {result._id}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-slate-600 text-[9px] font-black uppercase mb-1">Passed Cases</p>
                            <p className="text-lg font-black text-white">{result.testCasesPassed}/{result.totalTestCases}</p>
                          </div>
                          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-slate-600 text-[9px] font-black uppercase mb-1">Exec Time</p>
                            <p className="text-lg font-black text-white">{result.executionTime}ms</p>
                          </div>
                          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-slate-600 text-[9px] font-black uppercase mb-1">Memory</p>
                            <p className="text-lg font-black text-white">2.4 MB</p>
                          </div>
                          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-slate-600 text-[9px] font-black uppercase mb-1">XP Earned</p>
                            <p className="text-lg font-black text-amber-500">+{result.status === 'Accepted' ? '10' : '0'}</p>
                          </div>
                        </div>

                        {result.error && (
                          <div className="mt-6">
                            <p className="text-rose-900 uppercase text-[9px] font-bold mb-2">Error Details:</p>
                            <pre className="bg-rose-400/5 text-rose-400 p-4 rounded-2xl border border-rose-400/10 text-xs whitespace-pre-wrap">{result.error}</pre>
                          </div>
                        )}
                        
                        {result.output && result.status !== 'Accepted' && (
                          <div className="mt-6">
                            <p className="text-slate-600 uppercase text-[9px] font-bold mb-2">Last Output:</p>
                            <pre className="bg-white/5 text-slate-300 p-4 rounded-2xl border border-white/10 text-xs whitespace-pre-wrap">{result.output}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {outputTab === 'history' && (
                <div className="space-y-4">
                  <SubmissionHistory problemId={params.id} lastSubmission={result?.type === 'submit' ? result : null} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmissionHistory({ problemId, lastSubmission }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`/api/problems/${problemId}/submissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setSubmissions(data);
      } catch (err) {
        console.error('Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [problemId, lastSubmission]);

  if (loading) return <div className="text-slate-500 italic">Loading history...</div>;
  if (submissions.length === 0) return <div className="text-slate-700 italic">No previous submissions found.</div>;

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase text-slate-500 mb-2">Recent Submissions</h3>
      <div className="space-y-2">
        {submissions.map((sub) => (
          <div key={sub._id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${sub.status === 'Accepted' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
              <div>
                <div className="text-[11px] font-bold text-white">{sub.status}</div>
                <div className="text-[9px] text-slate-500 uppercase">{new Date(sub.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400">{sub.testCasesPassed}/{sub.totalTestCases}</div>
                <div className="text-[9px] text-slate-600 uppercase">Test Cases</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400">{sub.executionTime}ms</div>
                <div className="text-[9px] text-slate-600 uppercase">Runtime</div>
              </div>
              <div className="px-2 py-1 bg-white/5 rounded text-[9px] text-slate-500 font-mono">
                {sub.language}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
