import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  Accepted: 'text-green-400 bg-green-400/10',
  'Wrong Answer': 'text-red-400 bg-red-400/10',
  'Runtime Error': 'text-orange-400 bg-orange-400/10',
  'Compile Error': 'text-red-400 bg-red-400/10',
  'Time Limit Exceeded': 'text-yellow-400 bg-yellow-400/10',
};

function RadialProgress({ value, max, color, label, sublabel }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#1c2644" strokeWidth="7"/>
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 45 45)" style={{transition:'stroke-dasharray 1s ease'}}/>
        <text x="45" y="49" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Space Grotesk">{value}</text>
      </svg>
      <div className="text-center">
        <p className="text-xs font-medium" style={{color}}>{label}</p>
        <p className="text-xs text-slate-600">{sublabel}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>;

  const totalProblems = 72;
  const { totalSolved=0, totalSubmissions=0, acceptanceRate=0, byDifficulty={}, recentSubmissions=[] } = data || {};

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-1">Dashboard</h1>
          <p className="text-slate-400">Your coding progress overview</p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label:'Problems Solved', value:totalSolved, sub:`of ${totalProblems} total`, icon:'🎯', color:'#4cc9f0' },
            { label:'Total Submissions', value:totalSubmissions, sub:'all time', icon:'📤', color:'#4361ee' },
            { label:'Acceptance Rate', value:`${acceptanceRate}%`, sub:'success rate', icon:'✓', color:'#06d6a0' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
              className="glass rounded-xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs text-slate-600 font-mono">{s.sub}</span>
              </div>
              <div className="font-display font-bold text-3xl text-white">{s.value}</div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Difficulty breakdown */}
          <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.3}}
            className="col-span-1 glass rounded-xl p-5 border border-white/5">
            <h2 className="font-display font-semibold text-white text-sm mb-6">Difficulty Breakdown</h2>
            <div className="flex justify-around">
              <RadialProgress value={byDifficulty.Easy||0} max={24} color="#06d6a0" label="Easy" sublabel="of 24"/>
              <RadialProgress value={byDifficulty.Medium||0} max={36} color="#ffd60a" label="Medium" sublabel="of 36"/>
              <RadialProgress value={byDifficulty.Hard||0} max={12} color="#f72585" label="Hard" sublabel="of 12"/>
            </div>
          </motion.div>

          {/* Progress bar per course */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.35}}
            className="col-span-2 glass rounded-xl p-5 border border-white/5">
            <h2 className="font-display font-semibold text-white text-sm mb-4">Course Progress</h2>
            {[
              { label:'Web Development', icon:'🌐', color:'#3B82F6', solved:totalSolved > 0 ? Math.min(totalSolved, 18) : 0, total:18 },
              { label:'DSA',             icon:'🧮', color:'#10B981', solved:totalSolved > 18 ? Math.min(totalSolved-18,18) : 0, total:18 },
              { label:'DevOps',          icon:'⚙️', color:'#F59E0B', solved:totalSolved > 36 ? Math.min(totalSolved-36,18) : 0, total:18 },
              { label:'AI / ML',         icon:'🤖', color:'#8B5CF6', solved:totalSolved > 54 ? Math.min(totalSolved-54,18) : 0, total:18 },
            ].map(c => (
              <div key={c.label} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300 flex items-center gap-2"><span>{c.icon}</span>{c.label}</span>
                  <span className="text-xs text-slate-500 font-mono">{c.solved}/{c.total}</span>
                </div>
                <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                  <motion.div initial={{width:0}} animate={{width:`${(c.solved/c.total)*100}%`}} transition={{duration:1,delay:0.5}}
                    className="h-full rounded-full" style={{background:c.color}}/>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Recent submissions */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5}}
          className="glass rounded-xl p-5 border border-white/5">
          <h2 className="font-display font-semibold text-white text-sm mb-4">Recent Submissions</h2>
          {recentSubmissions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">No submissions yet. Start solving problems!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.slice(0,8).map((s, i) => (
                <div key={s._id || i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[s.status] || 'text-slate-400 bg-white/5'}`}>
                      {s.status}
                    </span>
                    <span className="text-slate-300 text-sm">{s.problemId?.title || 'Problem'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-mono">{s.language}</span>
                    <span>{new Date(s.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
