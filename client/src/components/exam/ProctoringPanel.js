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
        <FaceDetection mode="panel" onViolation={handleViolation} videoRef={videoRef} />
      )}
      
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
