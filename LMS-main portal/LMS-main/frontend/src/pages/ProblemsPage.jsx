import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';

const diffColor = {
  Easy:   { text:'text-green-400',  bg:'bg-green-400/10',  border:'border-green-400/30' },
  Medium: { text:'text-yellow-400', bg:'bg-yellow-400/10', border:'border-yellow-400/30' },
  Hard:   { text:'text-red-400',    bg:'bg-red-400/10',    border:'border-red-400/30' },
};
const langBadge = { javascript:'#F7DF1E', python:'#3776AB', java:'#ED8B00', cpp:'#00599C', html:'#E34F26', css:'#1572B6', bash:'#4EAA25', yaml:'#CB171E' };

export default function ProblemsPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/problems/topic/${topicId}`).then(res => {
      setProblems(res.data);
      if (res.data[0]) setTopic({ title: res.data[0].topicId });
    }).catch(console.error).finally(() => setLoading(false));
  }, [topicId]);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="mb-8">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors">← Back to Roadmap</button>
          <h1 className="font-display font-bold text-3xl text-white mb-2">Problems</h1>
          <p className="text-slate-400">{problems.length} challenges in this topic</p>
        </motion.div>

        <div className="space-y-3">
          {problems.map((p, i) => {
            const d = diffColor[p.difficulty] || diffColor.Easy;
            const langColor = langBadge[p.language] || '#888';
            return (
              <motion.div key={p._id}
                initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => navigate(`/editor/${p._id}`)}
                className="glass rounded-xl p-5 cursor-pointer card-hover border border-white/5 hover:border-white/15 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-slate-600 text-sm w-6 text-right">{i + 1}</span>
                    <div>
                      <h3 className="font-medium text-white group-hover:text-brand-300 transition-colors">{p.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {(p.tags || []).map(tag => (
                          <span key={tag} className="text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded font-mono">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{color: langColor, backgroundColor: `${langColor}15`}}>
                      {p.language}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${d.text} ${d.bg} ${d.border}`}>
                      {p.difficulty}
                    </span>
                    <span className="text-xs text-slate-600 font-mono">{p.submissionCount} submissions</span>
                    <span className="text-slate-600 group-hover:text-slate-300 transition-colors">→</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {problems.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <div className="text-4xl mb-4">🔍</div>
            <p>No problems found for this topic.</p>
          </div>
        )}
      </div>
    </div>
  );
}
