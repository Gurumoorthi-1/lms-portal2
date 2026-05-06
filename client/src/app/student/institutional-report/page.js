'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { authFetch } from '@/lib/api';
import { 
  Trophy, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Target,
  FileText,
  Loader2
} from 'lucide-react';

export default function InstitutionalReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stage = searchParams.get('stage') || 'MCQ';
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await authFetch('/progress/reports');
        const data = await res.json();
        const stageReport = data[stage.toLowerCase().replace(' ', '')];
        
        if (stageReport) {
          setReport(stageReport);
        } else {
          toast.error("Report generation in progress...");
          // Retry once after 3 seconds if not found
          setTimeout(async () => {
            const retryRes = await authFetch('/progress/reports');
            const retryData = await retryRes.json();
            const retryStageReport = retryData[stage.toLowerCase().replace(' ', '')];
            if (retryStageReport) setReport(retryStageReport);
            setLoading(false);
          }, 3000);
          return;
        }
      } catch (err) {
        toast.error("Failed to load report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [stage]);

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stage}_Performance_Report.json`;
    a.click();
    toast.success("Report downloaded successfully!");
  };

  const handleNext = () => {
    const routes = {
      'MCQ': '/student/resume',
      'Aptitude': '/student/coding',
      'Coding': '/student/interview',
      'HR Interview': '/student/results'
    };
    router.push(routes[stage] || '/student');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-[#2563EB] animate-spin" size={48} />
        <p className="text-[#64748B] font-bold animate-pulse text-lg">AI is generating your performance report...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#E2E8F0]"
        >
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] p-10 text-white text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <Trophy size={120} />
             </div>
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6"
             >
                <FileText size={40} />
             </motion.div>
             <h1 className="text-4xl font-black mb-2">{stage} Performance Report</h1>
             <p className="text-blue-100 font-medium">Detailed AI analysis of your skills and improvement areas.</p>
          </div>

          <div className="p-10">
            {report ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Side: Stats & Tips */}
                <div className="md:col-span-2 space-y-8">
                  {/* Verdict Section */}
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8">
                    <h3 className="text-lg font-black text-[#0F172A] mb-4 flex items-center gap-2">
                      <Zap className="text-amber-500" size={20} />
                      AI Performance Verdict
                    </h3>
                    <p className="text-[#475569] leading-relaxed font-medium italic text-lg">
                      "{report.performance}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-[#0F172A] flex items-center gap-2 px-2">
                        <CheckCircle2 className="text-emerald-500" size={18} />
                        Key Strengths
                      </h3>
                      <div className="space-y-2">
                        {report.strengths?.map((s, i) => (
                          <div key={i} className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-700 text-sm font-bold">
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Improvement */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-[#0F172A] flex items-center gap-2 px-2">
                        <Target className="text-blue-500" size={18} />
                        Improvement Tips
                      </h3>
                      <div className="space-y-2">
                        {report.improvementTips?.map((t, i) => (
                          <div key={i} className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-blue-700 text-sm font-bold">
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Score & Actions */}
                <div className="space-y-6">
                  <div className="bg-[#0F172A] rounded-3xl p-8 text-center text-white shadow-xl">
                    <p className="text-blue-400 font-black uppercase tracking-widest text-[10px] mb-2">Round Score</p>
                    <div className="text-6xl font-black mb-2">{report.score || '--'}%</div>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000" 
                        style={{ width: `${report.score || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <button 
                      onClick={handleDownload}
                      className="w-full py-4 bg-white border-2 border-[#E2E8F0] rounded-2xl font-black text-[#0F172A] hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={20} /> Download Report
                    </button>
                    <button 
                      onClick={handleNext}
                      className="w-full py-4 bg-[#2563EB] text-white rounded-2xl font-black hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                      Continue to Next Round <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <AlertCircle className="text-amber-500 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-black text-[#0F172A]">Report Still Processing</h3>
                <p className="text-[#64748B] font-medium mt-2">We're still finalizing your detailed AI analysis. Please wait a moment or try again from the dashboard.</p>
                <button 
                  onClick={() => router.push('/student')}
                  className="mt-8 px-8 py-3 bg-slate-100 rounded-xl font-bold text-[#475569] hover:bg-slate-200 transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
