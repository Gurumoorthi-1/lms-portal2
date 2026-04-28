import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';

function getHeatmapColor(count) {
  if (count === 0) return '#1c2644';
  if (count === 1) return '#163b6d';
  if (count <= 3) return '#1e5f9e';
  if (count <= 6) return '#2d7dd2';
  return '#4cc9f0';
}

function generateCalendarDays() {
  const days = [];
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  // Align to Sunday
  const start = new Date(oneYearAgo);
  start.setDate(start.getDate() - start.getDay());

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d).toISOString().split('T')[0]);
  }
  return days;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarPage() {
  const [activityMap, setActivityMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [stats, setStats] = useState({ total: 0, streak: 0, maxDay: 0 });

  useEffect(() => {
    api.get('/dashboard/calendar').then(res => {
      const map = res.data.activityMap || {};
      setActivityMap(map);

      const total = Object.values(map).reduce((a, b) => a + b, 0);
      const maxDay = Math.max(0, ...Object.values(map));

      // Streak calculation
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      let check = new Date();
      while (true) {
        const key = check.toISOString().split('T')[0];
        if (map[key]) { streak++; check.setDate(check.getDate() - 1); }
        else break;
        if (streak > 365) break;
      }

      setStats({ total, streak, maxDay });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const days = generateCalendarDays();

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Month labels
  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const firstDay = week[0];
    if (firstDay) {
      const d = new Date(firstDay);
      if (d.getDate() <= 7) {
        monthLabels.push({ week: wi, label: MONTHS[d.getMonth()] });
      }
    }
  });

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-1">Activity Calendar</h1>
          <p className="text-slate-400">Your daily coding heatmap</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label:'Total Submissions', value: stats.total, icon:'📤', color:'#4cc9f0' },
            { label:'Current Streak', value: `${stats.streak} days`, icon:'🔥', color:'#f72585' },
            { label:'Best Day', value: `${stats.maxDay} submissions`, icon:'⚡', color:'#ffd60a' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.1}}
              className="glass rounded-xl p-5 border border-white/5">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="font-display font-bold text-2xl text-white">{s.value}</div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Heatmap */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          className="glass rounded-2xl p-6 border border-white/5 overflow-x-auto">
          <h2 className="font-display font-semibold text-white text-sm mb-5">Submission Heatmap (Last 12 Months)</h2>

          <div className="flex gap-1 min-w-max">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-1 pt-6">
              {[0,1,2,3,4,5,6].map(d => (
                <div key={d} className="h-3 flex items-center text-xs text-slate-600 w-6">
                  {d % 2 === 1 ? DAYS[d].slice(0,1) : ''}
                </div>
              ))}
            </div>

            <div>
              {/* Month labels */}
              <div className="flex gap-1 mb-1">
                {weeks.map((_, wi) => {
                  const ml = monthLabels.find(m => m.week === wi);
                  return (
                    <div key={wi} className="w-3 text-xs text-slate-600 text-center" style={{fontSize:'9px'}}>
                      {ml ? ml.label : ''}
                    </div>
                  );
                })}
              </div>

              {/* Grid */}
              <div className="flex gap-1">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map(day => {
                      const count = activityMap[day] || 0;
                      const today = new Date().toISOString().split('T')[0];
                      const isToday = day === today;
                      return (
                        <div key={day} title={`${day}: ${count} submission${count !== 1 ? 's' : ''}`}
                          onMouseEnter={() => setHoveredDay({ day, count })}
                          onMouseLeave={() => setHoveredDay(null)}
                          className="w-3 h-3 rounded-sm cursor-pointer transition-all hover:scale-125"
                          style={{
                            backgroundColor: getHeatmapColor(count),
                            border: isToday ? '1px solid #4cc9f0' : '1px solid transparent',
                            opacity: day > new Date().toISOString().split('T')[0] ? 0 : 1
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-slate-600">Less</span>
            {[0,1,2,4,7].map(v => (
              <div key={v} className="w-3 h-3 rounded-sm" style={{backgroundColor: getHeatmapColor(v)}}/>
            ))}
            <span className="text-xs text-slate-600">More</span>
            {hoveredDay && (
              <span className="ml-4 text-xs text-slate-400 font-mono">
                {hoveredDay.day}: <span className="text-white font-bold">{hoveredDay.count}</span> submission{hoveredDay.count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </motion.div>

        {/* Monthly breakdown */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5}}
          className="glass rounded-2xl p-6 border border-white/5 mt-5">
          <h2 className="font-display font-semibold text-white text-sm mb-5">Monthly Activity</h2>
          <div className="grid grid-cols-6 gap-3">
            {MONTHS.map((month, mi) => {
              const year = new Date().getFullYear();
              const monthKey = `${year}-${String(mi+1).padStart(2,'0')}`;
              const monthCount = Object.entries(activityMap)
                .filter(([k]) => k.startsWith(monthKey))
                .reduce((a,[,v]) => a + v, 0);
              const maxMonth = Math.max(1, ...MONTHS.map((_, i2) => {
                const mk = `${year}-${String(i2+1).padStart(2,'0')}`;
                return Object.entries(activityMap).filter(([k]) => k.startsWith(mk)).reduce((a,[,v]) => a + v, 0);
              }));
              const barH = maxMonth > 0 ? Math.max(4, (monthCount / maxMonth) * 60) : 4;
              return (
                <div key={month} className="flex flex-col items-center gap-2">
                  <div className="h-16 flex items-end w-full">
                    <motion.div initial={{height:0}} animate={{height:`${barH}px`}} transition={{delay:0.6+mi*0.05, duration:0.5}}
                      className="w-full rounded-t-sm" style={{background: monthCount > 0 ? 'linear-gradient(to top, #4361ee, #4cc9f0)' : '#1c2644'}}/>
                  </div>
                  <span className="text-xs text-slate-500">{month}</span>
                  <span className="text-xs font-bold text-white">{monthCount}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
