'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authFetch, BASE_URL } from '@/lib/api';
import { CheckCircle2, Trophy, ArrowRight, Loader2, Target, Clock, ShieldCheck } from 'lucide-react';

const QUESTIONS = [
  {
    id: 1,
    question: "Which of the following is NOT a fundamental principle of Object-Oriented Programming (OOP)?",
    options: ["Encapsulation", "Inheritance", "Compilation", "Polymorphism"],
    answer: 2
  },
  {
    id: 2,
    question: "What is the time complexity of searching for an element in a balanced Binary Search Tree (BST)?",
    options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
    answer: 1
  },
  {
    id: 3,
    question: "Which data structure follows the Last-In-First-Out (LIFO) principle?",
    options: ["Queue", "Linked List", "Stack", "Array"],
    answer: 2
  }
];

export default function McqPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();

  const handleSelect = (optionIdx) => {
    setSelectedAnswers({ ...selectedAnswers, [currentIdx]: optionIdx });
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedAnswers).length < QUESTIONS.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/progress/mcq/submit', {
        method: 'POST',
        body: JSON.stringify({ answers: selectedAnswers })
      });

      const data = await res.json();

      if (data.passed) {
        // Save the new token to localStorage so Middleware allows next stage
        if (data.newToken) {
          localStorage.setItem('token', data.newToken);
          
          // Also set as cookie for middleware
          document.cookie = `token=${data.newToken}; path=/; max-age=86400; SameSite=Lax`;
        }
        
        setShowSuccessModal(true);
        
        // Auto-redirect after 2.5 seconds as per UX suggestion
        setTimeout(() => {
          router.push(data.nextRound || '/student/resume');
        }, 2500);
      } else {
        toast.error(data.message || "Assessment failed. Please try again.");
      }
    } catch (err) {
      toast.error("Submission failed. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = QUESTIONS[currentIdx];

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Area */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Technical MCQ Round</h1>
            <p className="text-[#64748B] font-medium mt-1">Foundations of Computer Science</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-2">
            <Clock className="text-[#7C3AED]" size={18} />
            <span className="text-sm font-black text-[#0F172A]">05:00</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs font-black text-[#64748B] uppercase tracking-widest">
            <span>Question {currentIdx + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(((currentIdx + 1) / QUESTIONS.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%` }}
              className="h-full bg-[#7C3AED]"
            />
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-[#E2E8F0]"
          >
            <h2 className="text-xl font-bold text-[#0F172A] mb-8 leading-relaxed">
              {currentQ.question}
            </h2>

            <div className="space-y-3">
              {currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                    selectedAnswers[currentIdx] === idx 
                      ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED]' 
                      : 'border-[#F1F5F9] hover:border-[#E2E8F0] bg-white text-[#475569]'
                  }`}
                >
                  <span className="font-bold">{option}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedAnswers[currentIdx] === idx ? 'border-[#7C3AED] bg-[#7C3AED]' : 'border-[#CBD5E1]'
                  }`}>
                    {selectedAnswers[currentIdx] === idx && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 flex justify-between items-center">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="px-6 py-3 rounded-xl font-bold text-[#64748B] hover:bg-slate-50 transition-colors disabled:opacity-30"
              >
                Previous
              </button>
              
              {currentIdx < QUESTIONS.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="px-8 py-3 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-[#1E293B] transition-all flex items-center gap-2"
                >
                  Next Question <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-10 py-3 bg-[#7C3AED] text-white rounded-xl font-black shadow-lg shadow-purple-500/30 hover:bg-[#6D28D9] transition-all flex items-center gap-2"
                >
                  {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Finish Assessment'}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl border border-white/20"
              >
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="text-emerald-500" size={48} />
                </div>
                
                <h2 className="text-3xl font-black text-[#0F172A] mb-4">Congratulations!</h2>
                <p className="text-[#64748B] font-medium leading-relaxed mb-8">
                  You have successfully passed the Technical MCQ Round. Your skills are impressive! 🚀
                </p>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <ShieldCheck className="text-[#7C3AED]" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">Next Stage</p>
                    <p className="text-sm font-bold text-[#0F172A]">AI Resume Upload</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="text-[#7C3AED] animate-spin" size={24} />
                  <p className="text-xs font-bold text-[#7C3AED]">Preparing your environment...</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
