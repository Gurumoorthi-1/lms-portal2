'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useSecurity } from '@/components/providers/SecurityProvider';

const FaceDetection = dynamic(() => import('./FaceDetection'), { ssr: false });

export default function ProctoringPanel({ videoRef, cameraReady, warnings, permissionError }) {
  const { totalViolations, reportViolation } = useSecurity();

  const handleViolation = (reason, severity = 'warning', type = 'ai_alert') => {
    reportViolation(type, reason, severity);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
      <h3 className="text-sm font-bold text-gray-800 mb-2">Proctoring Status</h3>
      {permissionError ? (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          Camera permission denied. Please allow camera access.
        </div>
      ) : (
        <FaceDetection 
          mode="panel" 
          onViolation={handleViolation} 
          videoRef={videoRef} 
        />
      )}
      
      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Monitor</span>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${totalViolations > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {totalViolations > 0 ? 'Status: Warning' : 'Status: Secured'}
        </span>
      </div>
      
      <div className="space-y-1">
        <p className="text-xs text-gray-500">Warnings: <span className="font-bold text-red-500">{totalViolations}/5</span></p>
        {warnings?.length > 0 && (
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {warnings.map(w => (
              <p key={w.id} className={`text-[10px] ${w.severity === 'error' || w.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                • {w.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
