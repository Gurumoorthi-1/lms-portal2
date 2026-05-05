// src/components/emotion/EmotionReport.js
// Feature 3: End-of-interview emotion analysis report modal
import React from 'react';
import { motion } from 'framer-motion';

import { TrendingUp, TrendingDown, MoveRight, Brain, Zap, Activity, BarChart, Lightbulb } from 'lucide-react';

const TREND_CONFIG = {
  improving: { icon: TrendingUp, color: '#10b981', text: 'Nervousness decreased as interview progressed — great adaptation!' },
  worsening:  { icon: TrendingDown, color: '#ef4444', text: 'Stress increased toward end — practice longer mock sessions.' },
  stable:     { icon: MoveRight, color: '#6b7280', text: 'Consistent composure throughout the interview.' },
};

export default function EmotionReport({ report, onClose }) {
  if (!report) return null;

  const trendCfg = TREND_CONFIG[report.nervTrend] || TREND_CONFIG.stable;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="px-6 py-5 text-white" style={{ background: 'linear-gradient(135deg, #0a0a5c, #ff5722)' }}>
          <h2 className="text-xl font-black mb-1 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            <Brain size={24} /> Emotion Analysis Report
          </h2>
          <p className="text-sm opacity-80">AI HR Interview — Behavioral Assessment</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Score cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Overall Confidence', value: `${report.avgConf}%`, color: '#10b981', Icon: Zap },
              { label: 'Avg Nervousness',   value: `${report.avgNerv}%`, color: '#f59e0b', Icon: Activity },
              { label: 'Data Points',       value: report.totalSamples,  color: '#3b82f6', Icon: BarChart },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center">
                <div className="mb-1 text-slate-400"><Icon size={20} /></div>
                <div className="text-lg font-black" style={{ color }}>{value}</div>
                <div className="text-[10px] text-gray-500 uppercase font-black leading-tight mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Dominant emotion */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Dominant Emotion</p>
            <p className="text-base font-bold text-gray-800 capitalize">{report.dominantOverall}</p>
          </div>

          {/* Nervousness trend */}
          <div className="p-4 rounded-xl border" style={{ borderColor: trendCfg.color + '40', background: trendCfg.color + '08' }}>
            <div className="flex items-center gap-2 mb-1">
              <trendCfg.icon size={18} style={{ color: trendCfg.color }} />
              <span className="text-sm font-bold capitalize" style={{ color: trendCfg.color }}>
                Nervousness Trend: {report.nervTrend}
              </span>
            </div>
            <p className="text-xs text-gray-600">{trendCfg.text}</p>
          </div>

          {/* Suggestions */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              <Lightbulb size={18} className="text-amber-500" /> Suggestions for Improvement
            </p>
            <div className="space-y-2">
              {(report.suggestions || []).map((s, i) => (
                <div key={i} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-orange-500 font-bold mt-0.5 shrink-0">→</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ background: '#0a0a5c' }}
          >
            Close Report
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
