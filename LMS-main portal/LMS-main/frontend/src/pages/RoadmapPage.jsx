import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';

const courseMetaMap = {
  'web-dev': { title:'Web Development', icon:'🌐', color:'#3B82F6' },
  'dsa':     { title:'DSA',              icon:'🧮', color:'#10B981' },
  'devops':  { title:'DevOps',           icon:'⚙️', color:'#F59E0B' },
  'ai-ml':   { title:'AI / ML',          icon:'🤖', color:'#8B5CF6' },
};

const diffColor = { Easy:'text-green-400 bg-green-400/10', Medium:'text-yellow-400 bg-yellow-400/10', Hard:'text-red-400 bg-red-400/10' };

export default function RoadmapPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const meta = courseMetaMap[courseId] || {};

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseRes = await api.get(`/courses/${courseId}`);
        setCourse(courseRes.data);
        const topicsRes = await api.get(`/topics/${courseRes.data._id}`);
        setTopics(topicsRes.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [courseId]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="mb-10">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors">
            ← Back
          </button>
          <div className="flex items-center gap-4">
            <div className="text-5xl">{meta.icon}</div>
            <div>
              <h1 className="font-display font-bold text-3xl text-white">{meta.title} Roadmap</h1>
              <p className="text-slate-400 mt-1">Follow this path to master the course</p>
            </div>
          </div>
        </motion.div>

        {/* Roadmap */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-500/50 via-brand-500/20 to-transparent"/>

          <div className="space-y-4">
            {topics.map((topic, i) => (
              <motion.div key={topic._id}
                initial={{ opacity:0, x:-30 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative pl-16"
              >
                {/* Node */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold font-mono"
                  style={{ borderColor: meta.color, backgroundColor: `${meta.color}20`, color: meta.color }}>
                  {i + 1}
                </div>

                <div onClick={() => navigate(`/problems/${topic._id}`)}
                  className="glass rounded-xl p-5 cursor-pointer card-hover border border-white/5 hover:border-white/15 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{topic.icon}</span>
                      <div>
                        <h3 className="font-display font-semibold text-white group-hover:text-brand-300 transition-colors">
                          {topic.title}
                        </h3>
                        <p className="text-slate-500 text-xs mt-0.5">{topic.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diffColor[topic.difficulty]}`}>
                        {topic.difficulty}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{topic.totalProblems} problems</span>
                      <span className="text-slate-600 group-hover:text-slate-300 transition-colors">→</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
