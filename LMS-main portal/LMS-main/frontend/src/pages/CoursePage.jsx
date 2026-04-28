import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const courses = [
  { slug:'web-dev', title:'Web Development', icon:'🌐', color:'#3B82F6', gradient:'from-blue-500/20 to-cyan-500/10', border:'border-blue-500/30', desc:'Master the full web stack from HTML basics to modern JavaScript. Build real projects and understand the browser inside-out.', level:'Beginner', topics:6 },
  { slug:'dsa', title:'Data Structures & Algorithms', icon:'🧮', color:'#10B981', gradient:'from-emerald-500/20 to-teal-500/10', border:'border-emerald-500/30', desc:'Crack coding interviews. Master arrays, trees, graphs, dynamic programming and sorting algorithms with Java.', level:'Intermediate', topics:6 },
  { slug:'devops', title:'DevOps Engineering', icon:'⚙️', color:'#F59E0B', gradient:'from-amber-500/20 to-yellow-500/10', border:'border-amber-500/30', desc:'Automate everything. Docker, Kubernetes, CI/CD pipelines, shell scripting and cloud infrastructure.', level:'Hard', topics:6 },
  { slug:'ai-ml', title:'AI / Machine Learning', icon:'🤖', color:'#8B5CF6', gradient:'from-violet-500/20 to-purple-500/10', border:'border-violet-500/30', desc:'Build intelligent systems with Python. Linear regression, neural networks, deep learning and NLP.', level:'Hard', topics:6 },
];

export default function CoursePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="mb-10">
          <h1 className="font-display font-bold text-3xl text-white mb-2">All Courses</h1>
          <p className="text-slate-400">Choose a learning path and master new skills</p>
        </motion.div>
        <div className="grid grid-cols-1 gap-5">
          {courses.map((c, i) => (
            <motion.div key={c.slug} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.1}}
              onClick={() => navigate(`/roadmap/${c.slug}`)}
              className={`glass rounded-2xl p-6 cursor-pointer card-hover border ${c.border} group relative overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-r ${c.gradient} opacity-40 group-hover:opacity-70 transition-opacity`}/>
              <div className="relative flex items-center gap-6">
                <div className="text-5xl">{c.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-display font-bold text-white text-xl">{c.title}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">{c.level}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{c.desc}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span>{c.topics} Topics</span>
                    <span>{c.topics * 3} Problems</span>
                  </div>
                </div>
                <div className="text-slate-600 group-hover:text-slate-300 transition-colors text-2xl">→</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
