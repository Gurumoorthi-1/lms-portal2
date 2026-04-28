import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const courses = [
  { slug:'web-dev', title:'Web Development', icon:'🌐', color:'#3B82F6', gradient:'from-blue-500/20 to-cyan-500/10', border:'border-blue-500/30', desc:'HTML · CSS · JavaScript · React', level:'Beginner', topics:6, problems:18 },
  { slug:'dsa', title:'DSA', icon:'🧮', color:'#10B981', gradient:'from-emerald-500/20 to-teal-500/10', border:'border-emerald-500/30', desc:'Arrays · Trees · DP · Graphs', level:'Intermediate', topics:6, problems:18 },
  { slug:'devops', title:'DevOps', icon:'⚙️', color:'#F59E0B', gradient:'from-amber-500/20 to-yellow-500/10', border:'border-amber-500/30', desc:'Docker · K8s · CI/CD · Bash', level:'Hard', topics:6, problems:18 },
  { slug:'ai-ml', title:'AI / ML', icon:'🤖', color:'#8B5CF6', gradient:'from-violet-500/20 to-purple-500/10', border:'border-violet-500/30', desc:'NumPy · Regression · Neural Nets', level:'Hard', topics:6, problems:18 },
];

const stats = [
  { label:'Total Problems', value:'72+', icon:'🎯' },
  { label:'Courses', value:'4', icon:'📚' },
  { label:'Languages', value:'8', icon:'💻' },
  { label:'Active Users', value:'∞', icon:'🔥' },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const containerVariants = { hidden:{}, show:{ transition:{ staggerChildren:0.1 } } };
  const itemVariants = { hidden:{opacity:0, y:20}, show:{opacity:1, y:0, transition:{duration:0.5}} };

  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/5 rounded-full blur-3xl"/>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-purple/5 rounded-full blur-3xl"/>
        {/* Grid dots */}
        <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle, #4361ee11 1px, transparent 1px)', backgroundSize:'40px 40px'}}/>
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Hero */}
        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{duration:0.7}}
          className="mb-12 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-mono">
              ✦ v2.0 — Now with AI Analysis
            </span>
          </div>
          <h1 className="font-display font-bold text-5xl text-white leading-tight mb-3">
            Hello, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Coder'}</span> 👋
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Pick a course, follow the roadmap, solve problems. Build real skills — one challenge at a time.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-4 gap-4 mb-12">
          {stats.map((s) => (
            <motion.div key={s.label} variants={itemVariants}
              className="glass rounded-xl p-4 text-center card-hover">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-display font-bold text-2xl text-white">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Course cards */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}>
          <h2 className="font-display font-semibold text-white text-xl mb-6 flex items-center gap-2">
            <span className="w-6 h-0.5 bg-gradient-to-r from-brand-500 to-transparent rounded"/>
            Choose Your Path
          </h2>
          <div className="grid grid-cols-2 gap-5">
            {courses.map((course, i) => (
              <motion.div key={course.slug}
                initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
                transition={{ delay: 0.1 * i + 0.4, duration:0.5 }}
                onClick={() => navigate(`/roadmap/${course.slug}`)}
                className={`relative glass rounded-2xl p-6 cursor-pointer card-hover border ${course.border} overflow-hidden group`}
              >
                {/* BG gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${course.gradient} opacity-60 group-hover:opacity-100 transition-opacity`}/>
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{course.icon}</div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 font-mono">
                      {course.level}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-white text-xl mb-1">{course.title}</h3>
                  <p className="text-slate-400 text-sm mb-5 font-mono text-xs">{course.desc}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span style={{color:course.color}}>●</span> {course.topics} Topics</span>
                    <span className="flex items-center gap-1"><span style={{color:course.color}}>●</span> {course.problems} Problems</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{color:course.color}}>
                    Start Learning <span>→</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
