'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { ArrowLeft, ShieldAlert, Maximize2, Minimize2 } from 'lucide-react';

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

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

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
        const res = await fetch('http://localhost:5001/interview/generate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ context: ctx, totalQuestions: 5 })
        });
        const data = await res.json();
        setQuestions(data.questions || []);
        
        // Start Unified Security Session
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
        alert('Failed to load questions: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [skills, resumeData, router, speak]);

  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentQ?.id] || '';

  useEffect(() => {
    if (transcript && inputMode === 'voice') setTypedAnswer(transcript);
  }, [transcript, inputMode]);

  const handleStartListening = () => {
    isRequestingPermissionRef.current = true;
    setTranscript('');
    setTypedAnswer('');
    startListening(t => setTypedAnswer(t));
    // Reset after 5s assuming permission is dealt with
    setTimeout(() => { isRequestingPermissionRef.current = false; }, 5000);
  };

  const handleStopListening = () => stopListening();

  const handleAnalyze = useCallback(async () => {
    const answerText = typedAnswer.trim();
    if (!answerText || !currentQ) return;
    setAnalyzing(true);
    stopSpeaking();
    try {
      const res = await fetch('http://localhost:5001/interview/evaluate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ question: currentQ.question, answer: answerText, evaluationCriteria: currentQ.evaluationCriteria })
      });
      const data = await res.json();
      setAnswers(prev => ({ ...prev, [currentQ.id]: answerText }));
      setAnalyses(prev => ({ ...prev, [currentQ.id]: data }));
      if (data.followUp) {
        setTimeout(() => speak(data.followUp), 500);
        setShowFollowUp(true);
      }
    } catch (err) {
      alert('Analysis error: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [typedAnswer, currentQ, stopSpeaking, speak]);

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
      // Call the finish endpoint to promote to FINISHED stage
      const res = await fetch('http://localhost:5001/interview/finish', {
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
      alert('Error finalizing interview: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const currentAnalysis = analyses[currentQ?.id];
  const isAnswered = !!answers[currentQ?.id];

  // Auto-trigger fullscreen when loaded
  useEffect(() => {
    if (!loading && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [loading]);

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

  return (
    <div className="min-h-screen bg-gray-50 select-none">
      <AnimatePresence>
        {showEmotionReport && emotionReport && (
          <EmotionReport
            report={emotionReport}
            onClose={() => { setShowEmotionReport(false); doComplete(); }}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-5">
            <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.push('/student')}
                  className="p-2 rounded-xl hover:bg-gray-100 text-indigo-600 transition-all group"
                  title="Back to Dashboard"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                  <h1 className="text-xl font-black text-indigo-900">AI HR Interview</h1>
                  <p className="text-sm text-gray-500">Question {currentIdx + 1} of {questions.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                  style={{ borderColor: emotionLabel?.color + '50', background: emotionLabel?.color + '10' }}>
                  <span className="text-sm">{emotionLabel?.label?.split(' ')[1] || '😐'}</span>
                  <span className="text-xs font-bold" style={{ color: emotionLabel?.color }}>{confidence}%</span>
                </div>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full transition-all"
                      style={{ background: answers[questions[i]?.id] ? '#10b981' : i === currentIdx ? '#ff5722' : '#e5e7eb' }} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">{answeredCount}/{questions.length} answered</span>
              </div>
            </div>

            {currentQ && (
              <AnimatePresence mode="wait">
                <motion.div key={currentQ.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs px-3 py-1 rounded-full font-semibold text-white"
                      style={{ background: currentQ.type === 'intro' ? '#312e81' : currentQ.type === 'behavioral' ? '#f97316' : '#10b981' }}>
                      {currentQ.type}
                    </span>
                    {isSpeaking && <span className="text-xs text-blue-500 flex items-center gap-1"><span className="animate-pulse">🔊</span> AI Speaking...</span>}
                    {faceDetected && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600">{emotionLabel?.label || 'Neutral'}</span>}
                  </div>

                  <h2 className="text-xl font-bold text-gray-800 mb-2 leading-relaxed">{currentQ.question}</h2>
                  <p className="text-xs text-gray-400 mb-6">Evaluation: {currentQ.evaluationCriteria}</p>

                  <AnimatePresence>
                    {showFollowUp && currentAnalysis?.followUp && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mb-4 p-4 rounded-xl border-l-4 bg-blue-50 border-blue-400">
                        <p className="text-sm font-semibold text-blue-800 mb-1">🤖 AI Follow-up</p>
                        <p className="text-sm text-blue-700">{currentAnalysis.followUp}</p>
                        <button onClick={() => speak(currentAnalysis.followUp)} className="text-xs text-blue-500 mt-1 hover:underline">🔊 Hear again</button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isAnswered ? (
                    <div className="space-y-4">
                      <div className="flex gap-2 mb-4">
                        {['voice', 'type'].map(mode => (
                          <button key={mode} onClick={() => setInputMode(mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                              inputMode === mode ? 'bg-indigo-900 text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'
                            }`}>
                            {mode === 'voice' ? '🎤 Voice Input' : '⌨️ Type Answer'}
                          </button>
                        ))}
                      </div>

                      {inputMode === 'voice' && (
                        <div className="flex flex-col items-center gap-4 py-6 border-2 border-dashed border-gray-200 rounded-xl">
                          <motion.button onClick={isListening ? handleStopListening : handleStartListening}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all text-white ${
                              isListening ? 'bg-red-500 animate-pulse' : 'bg-indigo-900'
                            }`}>
                            {isListening ? '⏹' : '🎤'}
                          </motion.button>
                          <p className="text-sm text-gray-500">{isListening ? '🔴 Listening...' : 'Tap to speak'}</p>
                          {typedAnswer && (
                            <div className="w-full p-3 bg-gray-50 rounded-xl text-sm text-gray-700 text-left max-h-32 overflow-y-auto">
                              {typedAnswer}
                            </div>
                          )}
                        </div>
                      )}

                      {inputMode === 'type' && (
                        <textarea ref={textareaRef} value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-blue-400 transition-all" />
                      )}

                      <div className="flex gap-3">
                        <motion.button onClick={handleAnalyze} disabled={!typedAnswer.trim() || analyzing}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-40 transition-all bg-orange-500">
                          {analyzing ? '🤖 Analyzing...' : '✓ Submit Answer'}
                        </motion.button>
                        <button onClick={() => speak(currentQ.question)} disabled={isSpeaking}
                          className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 transition-all">
                          🔊
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 mb-2">YOUR ANSWER</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{currentAnswer}</p>
                      </div>

                      {currentAnalysis && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl border border-gray-200 bg-blue-50/50">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-bold text-gray-800 text-sm">AI Analysis</p>
                            <span className={`font-bold text-lg ${currentAnalysis.score >= 7 ? 'text-green-500' : currentAnalysis.score >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {currentAnalysis.score}/10
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{currentAnalysis.analysis}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-1">✓ Strengths</p>
                              {(currentAnalysis.strengths || []).map((s, i) => <p key={i} className="text-xs text-green-600">• {s}</p>)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-orange-600 mb-1">↑ Improve</p>
                              {(currentAnalysis.improvements || []).map((s, i) => <p key={i} className="text-xs text-orange-500">• {s}</p>)}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="flex gap-3">
                        {currentIdx < questions.length - 1 ? (
                          <motion.button onClick={handleNext} whileHover={{ scale: 1.02 }}
                            className="flex-1 py-3 rounded-xl text-white font-bold bg-indigo-900">
                            Next Question →
                          </motion.button>
                        ) : (
                          <motion.button onClick={handleComplete} whileHover={{ scale: 1.02 }}
                            className="flex-1 py-3 rounded-xl text-white font-bold bg-orange-500">
                            Complete Interview 🎉
                          </motion.button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Questions Overview</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {questions.map((q, i) => (
                  <div key={q.id} className={`p-3 rounded-xl text-xs border ${
                    i === currentIdx ? 'border-orange-500 text-white bg-orange-500' :
                    answers[q.id] ? 'bg-green-50 border-green-200 text-green-700' :
                    'bg-gray-50 border-gray-200 text-gray-500'
                  }`}>
                    <div className="font-bold mb-1">Q{i + 1}</div>
                    <div className="truncate">{q.type}</div>
                    {answers[q.id] && <div className="text-green-600 font-bold mt-1">✓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ProctoringPanel 
              videoRef={videoRef}
              cameraReady={cameraReady} 
              warnings={warnings} 
              permissionError={permissionError} 
            />
            <EmotionPanel isLoaded={emotionLoaded} faceDetected={faceDetected} currentEmotion={currentEmotion} emotionLabel={emotionLabel}
              confidence={confidence} nervousness={nervousness} emotionHistory={emotionHistory} />

            {answeredCount >= Math.ceil(questions.length * 0.6) && (
              <motion.button onClick={handleComplete} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-green-500">
                ✓ Finish Interview
              </motion.button>
            )}
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
