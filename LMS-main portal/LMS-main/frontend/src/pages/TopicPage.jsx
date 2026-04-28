import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { problemAPI, topicAPI } from '../utils/api';

const DIFF_COLOR = { Easy:'text-neon-green', Medium:'text-neon-amber', Hard:'text-red-400' };
const DIFF_BG = { Easy:'bg-neon-green/10 border-neon-green/20', Medium:'bg-neon-amber/10 border-neon-amber/20', Hard:'bg-red-400/10 border-red-400/20' };

export default function TopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      problemAPI.getByTopic(topicId),
      fetch(`http://localhost:5000/topics/${topicId}`).then(r=>r.json()).catch(()=>null)
    ]).then(([probRes]) => {
      setProblems(probRes.data);
      if (probRes.data.length > 0) {
        fetch(`http://localhost:5000/topics/${probRes.data[0].topicId}`)
          .catch(() => {});
      }
      setLoading(false);
    });
  }, [topicId]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-electric-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-sm flex items-center gap-2 mb-4">← Back to Roadmap</button>
        <h1 className="font-display text-3xl font-bold text-white">Problems</h1>
        <p className="text-gray-400 mt-1">{problems.length} challenges available</p>
      </motion.div>

      <div className="space-y-3">
        {problems.map((problem, idx) => (
          <motion.div
            key={problem._id}
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay: idx * 0.08 }}
            whileHover={{ x: 4 }}
            onClick={() => navigate(`/editor/${problem._id}`)}
            className="glass rounded-xl p-5 cursor-pointer border border-white/5 hover:border-electric-500/40 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400 font-mono text-sm font-bold">
                {String(idx + 1).padStart(2,'0')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white group-hover:text-electric-300 transition-colors truncate">{problem.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs font-medium ${DIFF_COLOR[problem.difficulty]}`}>{problem.difficulty}</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-xs text-gray-500 font-mono">{problem.language}</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-xs text-gray-500">{problem.submissionCount || 0} submissions</span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {(problem.tags || []).slice(0,2).map(tag => (
                  <span key={tag} className="hidden sm:block text-xs px-2 py-1 bg-white/5 rounded-lg text-gray-500">{tag}</span>
                ))}
                <span className="text-electric-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg">→</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
