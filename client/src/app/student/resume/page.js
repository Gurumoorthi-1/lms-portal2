'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterviewStore } from '@/hooks/useInterviewStore';
import Skeleton from '@/components/ui/Skeleton';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';


export default function ResumePage() {
  const router = useRouter();
  const setResumeData = useInterviewStore(state => state.setResumeData);
  const analysis = useInterviewStore(state => state.resumeData);
  
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback((f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      setError('Only PDF, DOCX, and TXT files are supported.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB.');
      return;
    }
    setError('');
    setFile(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('http://localhost:5001/resume/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      
      setResumeData(data.analysis);

      // Persist the new token to allow stage-based navigation
      if (data.newToken) {
        localStorage.setItem('token', data.newToken);
        document.cookie = `token=${data.newToken}; path=/; max-age=86400; SameSite=Lax`;
        toast.success('Resume analyzed! You are now eligible for the Aptitude Test.');
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleProceed = async () => {
    try {
      // Force promotion to ensure token is synced even if resume was loaded from cache.
      // Pass fromStage to prevent double-promotion if already promoted.
      const res = await fetch('http://localhost:5001/progress/next-stage', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ fromStage: 'RESUME_UPLOAD' })
      });
      const data = await res.json();
      if (data.newToken) {
        localStorage.setItem('token', data.newToken);
        document.cookie = `token=${data.newToken}; path=/; max-age=86400; SameSite=Lax`;
      }
    } catch (err) {
      console.error('Failed to sync stage before navigation:', err);
    }
    window.location.href = '/student/aptitude';
  };

  const atsColor = analysis?.atsScore >= 80 ? '#10b981' : analysis?.atsScore >= 60 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 40;
  const dashOffset = analysis ? circumference - (circumference * (analysis.atsScore || 0)) / 100 : circumference;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button 
            onClick={() => router.push('/student')}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold mb-4 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-black mb-2 text-indigo-900">Round 1 — Resume Analysis</h1>
          <p className="text-gray-500">Upload your resume for AI-powered ATS scoring and skill extraction</p>
        </motion.div>

        {!analysis ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-8">
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                  dragging ? 'border-orange-500 bg-orange-50 scale-105' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-500 bg-white'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                <div className="text-5xl mb-4">{file ? '✅' : '📄'}</div>
                {file ? (
                  <>
                    <p className="font-bold text-green-700">{file.name}</p>
                    <p className="text-sm text-green-500 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-700 mb-1">Drop your resume here</p>
                    <p className="text-sm text-gray-400">or click to browse</p>
                    <p className="text-xs text-gray-400 mt-3">PDF / DOCX — max 10MB</p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  ⚠️ {error}
                </div>
              )}

              {uploading ? (
                <div className="mt-6 space-y-4">
                  <Skeleton height="60px" rounded="rounded-2xl" />
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton height="150px" rounded="rounded-2xl" />
                    <Skeleton height="150px" rounded="rounded-2xl" />
                    <Skeleton height="150px" rounded="rounded-2xl" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="mt-6 w-full py-4 rounded-2xl text-white font-bold text-lg transition-all disabled:opacity-40 bg-orange-500 hover:bg-orange-600"
                >
                  🔍 Analyze Resume
                </button>
              )}
            </div>

            <div className="space-y-4">
              {[
                { icon: '🎯', title: 'ATS Score', desc: 'Get your ATS compatibility score out of 100' },
                { icon: '🧠', title: 'Skill Extraction', desc: 'AI identifies your technical and soft skills automatically' },
                { icon: '💡', title: 'Smart Suggestions', desc: 'Actionable improvements to boost your resume quality' },
                { icon: '📊', title: 'Gap Analysis', desc: 'Discover missing skills for your target role' },
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={atsColor} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
                  <text x="50" y="54" textAnchor="middle" fontSize="20" fontWeight="bold" fill={atsColor}>{analysis.atsScore}</text>
                  <text x="50" y="68" textAnchor="middle" fontSize="9" fill="#9ca3af">ATS Score</text>
                </svg>
                <p className="text-sm font-semibold mt-2" style={{ color: atsColor }}>
                  {analysis.atsScore >= 80 ? '🟢 Excellent' : analysis.atsScore >= 60 ? '🟡 Good' : '🔴 Needs Work'}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">🛠 Detected Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.skills || []).map(skill => (
                    <span key={skill} className="px-2 py-1 rounded-lg text-xs font-medium text-white bg-indigo-900">{skill}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">📝 Summary</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{analysis.summary || 'AI-analyzed your professional background.'}</p>
              </div>
            </div>

            <button onClick={handleProceed}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg bg-indigo-900 hover:bg-indigo-800 transition-colors">
              Continue to Aptitude Test →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
