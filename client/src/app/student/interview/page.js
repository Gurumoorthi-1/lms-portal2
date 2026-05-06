'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterviewStore } from '@/hooks/useInterviewStore';
import { useProctoring } from '@/hooks/useProctoring';
import Skeleton from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { useSecurity } from '@/components/providers/SecurityProvider';

import { useSpeech } from '@/hooks/useSpeech';
import { useEmotionAnalysis } from '@/hooks/useEmotionAnalysis';
import ProctoringPanel from '@/components/exam/ProctoringPanel';
import EmotionPanel from '@/components/exam/EmotionPanel';
import EmotionReport from '@/components/exam/EmotionReport';
import { 
  ArrowLeft, ShieldAlert, Maximize2, Minimize2, 
  Mic, MicOff, Send, User, Volume2, Loader2, 
  StopCircle, Timer as TimerIcon, Activity, Sparkles, Star, Target
} from 'lucide-react';

import { authFetch, BASE_URL } from '@/lib/api';

const FaceDetection = dynamic(() => import('@/components/exam/FaceDetection'), { ssr: false });

export default function InterviewPage() {
  const router = useRouter();
  const { resumeData, skills, setInterviewResults } = useInterviewStore();
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [analyses, setAnalyses] = useState({});
  const [typedAnswer, setTypedAnswer] = useState('');
  const [inputMode, setInputMode] = useState('voice');
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showEmotionReport, setShowEmotionReport] = useState(false);
  const [emotionReport, setEmotionReport] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Security Orchestrator
  const { 
    totalViolations, 
    isDisqualified, 
    startSecurity, 
    reportViolation,
    config: securityConfig
  } = useSecurity();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const isRequestingPermissionRef = useRef(false);
  const pageLoadTimeRef = useRef(Date.now());

  const { videoRef, cameraReady, permissionError, warnings, requestFullscreen } = useProctoring({
    sessionId: 'session-id', round: 'round3', enabled: true,
  });

  const { speak, stopSpeaking, isSpeaking, startListening, stopListening, isListening, transcript, setTranscript } = useSpeech();

  const {
    isLoaded: emotionLoaded,
    faceDetected,
    currentEmotion,
    emotionLabel,
    confidence,
    nervousness,
    emotionHistory,
    generateReport,
  } = useEmotionAnalysis({ videoRef, enabled: cameraReady });

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
      return;
    }
    (async () => {
      try {
        const ctx = {
          skills: skills.join(', '),
          experience: resumeData?.experience?.join('; ') || '',
          resumeText: resumeData?.summary || ''
        };
        const res = await fetch(`${BASE_URL}/interview/generate`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ context: ctx, totalQuestions: 5 })
        });
        const data = await res.json();
        setQuestions(data.questions || []);
        
        startSecurity({ 
          sessionId: 'assessment-interview-session', 
          round: 'interview',
          maxViolations: 5,
          maxCritical: 2
        });

        setTimeout(() => {
          if (data.questions?.[0]) speak(data.questions[0].question);
        }, 1500);
      } catch (err) {
        toast.error('Failed to load questions: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isHydrated, skills, resumeData, router, speak, startSecurity]);

  // Auto-trigger analysis if needed logic could be added here if desired, 
  // but removing timer based auto-submission as requested.

  useEffect(() => {
    if (transcript && inputMode === 'voice') setTypedAnswer(transcript);
  }, [transcript, inputMode]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [answers, currentIdx, typedAnswer, analyzing]);

  const handleStartListening = () => {
    isRequestingPermissionRef.current = true;
    setTranscript('');
    setTypedAnswer('');
    startListening(t => setTypedAnswer(t));
    setTimeout(() => { isRequestingPermissionRef.current = false; }, 5000);
  };

  const handleAnalyze = useCallback(async () => {
    const currentQ = questions[currentIdx];
    const answerText = typedAnswer.trim();
    if (!answerText || !currentQ) return;
    
    setAnalyzing(true);
    stopSpeaking();
    stopListening();
    
    try {
      const res = await fetch(`${BASE_URL}/interview/evaluate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          question: currentQ.question, 
          answer: answerText, 
          evaluationCriteria: currentQ.evaluationCriteria 
        })
      });
      const data = await res.json();
      setAnswers(prev => ({ ...prev, [currentQ.id]: answerText }));
      setAnalyses(prev => ({ ...prev, [currentQ.id]: data }));
      
      if (data.followUp) {
        setTimeout(() => speak(data.followUp), 500);
        setShowFollowUp(true);
      }
    } catch (err) {
      toast.error('Analysis error: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [typedAnswer, currentIdx, questions, stopSpeaking, stopListening, speak]);

  const handleNext = () => {
    setShowFollowUp(false);
    setTypedAnswer('');
    setTranscript('');
    stopSpeaking();
    stopListening();
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setTimeout(() => speak(questions[nextIdx].question), 800);
    }
  };

  const handleComplete = async () => {
    stopSpeaking();
    stopListening();
    const report = generateReport();
    if (report) {
      setEmotionReport(report);
      setShowEmotionReport(true);
    } else {
      await doComplete();
    }
  };

  const doComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`${BASE_URL}/interview/finish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();

      if (data.newToken) {
        localStorage.setItem('token', data.newToken);
        document.cookie = `token=${data.newToken}; path=/; max-age=86400; SameSite=Lax`;
      }

      const finalRes = {
        answers,
        analyses,
        emotionReport
      };
      setInterviewResults(finalRes);
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      router.push('/student/analytics');
    } catch (err) {
      toast.error('Error finalizing interview: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Skeleton height="80px" rounded="rounded-2xl" />
          <Skeleton height="350px" rounded="rounded-2xl" />
          <Skeleton height="150px" rounded="rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton height="200px" rounded="rounded-2xl" />
          <Skeleton height="250px" rounded="rounded-2xl" />
        </div>
      </div>
    </div>
  );

  const currentQ = questions[currentIdx];
  const currentAnalysis = analyses[currentQ?.id];
  const isAnswered = !!answers[currentQ?.id];

  return (
    <div className="min-h-screen bg-slate-50/50 select-none font-sans overflow-hidden">
      <AnimatePresence>
        {showEmotionReport && emotionReport && (
          <EmotionReport
            report={emotionReport}
            onClose={() => { setShowEmotionReport(false); doComplete(); }}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6 h-screen flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-white rounded-3xl px-8 py-5 shadow-sm border border-slate-200/60 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/student')} className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-indigo-600 transition-all group border border-slate-200/50">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">AI Assessment Round</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1"><Target size={14} /> Stage 4: HR Interview</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>{currentIdx + 1} of {questions.length} Questions</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl border bg-white border-slate-200 shadow-sm">
                <span className="flex items-center gap-1">
                  {emotionLabel?.Icon && <emotionLabel.Icon size={18} style={{ color: emotionLabel.color }} />}
                  <span className="text-sm font-black text-slate-700 ml-1">{emotionLabel?.label || 'Neutral'}</span>
                </span>
                <span className="text-sm font-black text-slate-700 border-l pl-2 ml-1 border-slate-200">{confidence}%</span>
             </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden pb-6">
          
          {/* Side Info Panel */}
          <div className="hidden lg:flex flex-col gap-6 overflow-y-auto pr-1 custom-scrollbar">
            {/* AI Avatar Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center border border-white/10 aspect-square shrink-0">
               <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 via-transparent to-slate-950 z-10" />
               <motion.div 
                  animate={{ 
                    scale: analyzing ? [1, 1.05, 1] : [1, 1.02, 1],
                    y: [0, -5, 0]
                  }}
                  transition={{ repeat: Infinity, duration: analyzing ? 2 : 5, ease: "easeInOut" }}
                  className={`relative w-40 h-40 rounded-full mb-6 border-4 shadow-2xl overflow-hidden bg-slate-800 transition-colors duration-500 z-20 ${analyzing ? 'border-indigo-400 shadow-indigo-500/40' : 'border-slate-700/50 shadow-black/20'}`}
                >
                  <img src="/ai-avatar.png" alt="AI Specialist" className={`w-full h-full object-cover transition-all duration-1000 ${analyzing ? 'brightness-110 saturate-110 scale-110' : 'brightness-90 saturate-100'}`} />
                  <AnimatePresence>
                    {analyzing && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="flex items-end space-x-1.5 h-6">
                          {[0, 1, 2, 3].map((i) => (
                            <motion.div key={i} animate={{ height: [8, 20, 8], backgroundColor: ['#818cf8', '#6366f1', '#818cf8'] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} className="w-1.5 rounded-full" />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </motion.div>
               <div className="relative z-20 text-center">
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">AI HR Specialist</h3>
                  <div className="flex items-center justify-center space-x-2 bg-white/5 px-4 py-1 rounded-full backdrop-blur-md border border-white/10">
                    <span className={`w-2 h-2 rounded-full ${analyzing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                    <span className="font-bold tracking-widest uppercase text-[10px] text-slate-400">
                      {analyzing ? 'Analyzing' : 'Listening'}
                    </span>
                  </div>
               </div>
            </div>

            <ProctoringPanel videoRef={videoRef} cameraReady={cameraReady} warnings={warnings} permissionError={permissionError} />
            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex flex-col shrink-0">
               <h3 className="font-black text-slate-900 mb-4 flex items-center text-sm uppercase tracking-wider">
                  <Activity size={16} className="mr-2 text-indigo-500" /> Recent Feedback
               </h3>
               <div className="flex-1 min-h-[100px]">
                  {currentAnalysis ? (
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                      <p className="text-slate-700 text-xs italic leading-relaxed font-medium">"{currentAnalysis.analysis?.split('.')[0] || 'Analyzing...'}..."</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center p-4">
                      <Volume2 size={24} className="mb-2" />
                      <p className="text-[10px] font-bold text-slate-500">Feedback will appear here.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Main Interaction Area */}
          <div className="lg:col-span-3 flex flex-col bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 overflow-hidden relative">
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-slate-50/30 custom-scrollbar">
              <AnimatePresence>
                {questions.slice(0, currentIdx + 1).map((q, idx) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {/* AI Message */}
                    <div className="flex items-start max-w-[85%]">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mr-4 shrink-0 mt-1 shadow-sm">
                        <User size={20} />
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white border border-slate-200 px-6 py-4 rounded-3xl rounded-tl-sm shadow-sm">
                           <p className="text-slate-800 leading-relaxed font-semibold">{q.question}</p>
                        </div>
                        {idx === currentIdx && isSpeaking && (
                          <span className="text-[10px] font-black text-indigo-500 flex items-center gap-1 ml-2 uppercase tracking-widest">
                            <span className="animate-pulse">🔊</span> AI is Speaking
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Follow-up if exists */}
                    {idx === currentIdx && showFollowUp && analyses[q.id]?.followUp && (
                       <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start max-w-[80%] ml-14">
                          <div className="bg-amber-50 border border-amber-200 px-6 py-4 rounded-3xl rounded-tl-sm shadow-sm relative">
                             <div className="absolute -left-2 top-4 w-4 h-4 bg-amber-50 border-l border-t border-amber-200 rotate-[-45deg]" />
                             <p className="text-amber-900 leading-relaxed text-sm font-bold">🤖 {analyses[q.id].followUp}</p>
                          </div>
                       </motion.div>
                    )}

                    {/* User Answer */}
                    {(answers[q.id] || (idx === currentIdx && typedAnswer)) && (
                      <div className="flex items-start justify-end">
                        <div className="bg-indigo-600 text-white px-6 py-4 rounded-3xl rounded-tr-sm shadow-lg max-w-[85%]">
                           <p className="leading-relaxed font-medium">{answers[q.id] || typedAnswer}</p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center ml-4 shrink-0 mt-1 shadow-sm font-black uppercase">
                          {resumeData?.name?.charAt(0) || 'U'}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {analyzing && (
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mr-4 shrink-0 mt-1 shadow-sm">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-200 px-6 py-4 rounded-3xl rounded-tl-sm shadow-sm flex space-x-1.5 items-center">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom Controls */}
            <div className="p-8 bg-white/80 backdrop-blur-md border-t border-slate-200/50">
              <div className="flex flex-col md:flex-row items-center gap-4 max-w-5xl mx-auto">
                
                <div className="flex-1 w-full relative flex items-center gap-3">
                  <button
                    onClick={isListening ? stopListening : handleStartListening}
                    disabled={(isAnswered && !showFollowUp) || analyzing}
                    className={`flex-shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-lg border-2 ${
                      isListening 
                        ? 'bg-rose-50 border-rose-500 text-rose-500 animate-pulse' 
                        : 'bg-indigo-600 border-indigo-700/50 text-white hover:scale-105 hover:shadow-indigo-500/30 disabled:opacity-30'
                    }`}
                    title={isListening ? "Stop Recording" : "Start Recording"}
                  >
                    {isListening ? <StopCircle size={28} /> : <Mic size={28} />}
                  </button>
                  
                  <div className="relative flex-1 group">
                    <textarea
                      ref={textareaRef}
                      value={typedAnswer}
                      onChange={(e) => {
                        setTypedAnswer(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                      }}
                      onFocus={() => setInputMode('type')}
                      disabled={(isAnswered && !showFollowUp) || analyzing}
                      placeholder={isListening ? "Listening to your voice..." : "Type your answer or use the mic..."}
                      rows={1}
                      className="w-full min-h-[64px] max-h-[150px] bg-slate-100 rounded-[2rem] border-2 border-transparent px-8 py-5 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-700 disabled:opacity-50 resize-none overflow-y-auto custom-scrollbar"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAnalyze();
                        }
                      }}
                    />
                    <div className="absolute right-6 bottom-4 flex items-center gap-2">
                       <button onClick={() => speak(currentQ?.question)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Volume2 size={20} />
                       </button>
                    </div>
                  </div>
                </div>
                
                {isAnswered && !showFollowUp ? (
                   <button
                      onClick={currentIdx < questions.length - 1 ? handleNext : handleComplete}
                      className="w-full md:w-auto bg-slate-900 hover:bg-black text-white px-10 h-16 rounded-3xl font-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3 group"
                    >
                      {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                      <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                    </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {showFollowUp && (
                      <button
                        onClick={currentIdx < questions.length - 1 ? handleNext : handleComplete}
                        className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 h-16 rounded-3xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-200"
                      >
                        Skip Elaboration
                      </button>
                    )}
                    <button
                      onClick={handleAnalyze}
                      disabled={!typedAnswer.trim() || analyzing}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-16 rounded-3xl font-black transition-all shadow-xl hover:shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {analyzing ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                      {currentIdx === questions.length - 1 && !typedAnswer.trim() ? (
                        'Finish Interview'
                      ) : (
                        'Submit Answer'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
