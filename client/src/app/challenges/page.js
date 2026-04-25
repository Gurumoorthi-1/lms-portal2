"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CodeEditor from '../../components/codelab/CodeEditor';
import toast from 'react-hot-toast';

const LANG_COLORS = { javascript:'#eab308', python:'#2563eb', java:'#f97316' };
const LANG_LABELS = { javascript:'JS', python:'PY', java:'JAVA' };
const DIFF_COLORS = { Easy:'#16a34a', Medium:'#f59e0b', Hard:'#dc2626' };
const DIFF_BG = { Easy:'#dcfce7', Medium:'#fef3c7', Hard:'#fee2e2' };

export default function ChallengesPage() {
  const [user, setUser] = useState({ points: 0 }); // Mock user wrapper
  const [challenges, setChallenges] = useState([]);
  const [solved, setSolved] = useState([]);
  const [selected, setSelected] = useState(null);
  const [code, setCode] = useState('');
  const [filter, setFilter] = useState('all');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [output, setOutput] = useState(null);
  const [review, setReview] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [successModal, setSuccessModal] = useState(null);

  useEffect(() => {
    loadChallenges();
    loadProgress();
  }, []);

  async function loadChallenges() {
    try {
      const res = await fetch('/api/challenges');
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.map((c, i) => ({ ...c, displayNumber: i + 1 })));
      }
    } catch {
      toast.error('Failed to load challenges');
    }
  }

  async function loadProgress() {
    try {
      const res = await fetch('/api/progress/me', { headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setSolved(data.solvedChallenges?.map(s => s.challengeId) || []);
        setUser({ points: data.points || 0 });
      }
    } catch {
      console.warn("Could not load user progress.");
    }
  }

  function selectChallenge(c) {
    setSelected(c);
    setCode(c.starterCode);
    setOutput(null);
    setReview(null);
    setShowHint(false);
  }

  async function runChallenge() {
    if (!code.trim()) return toast.error('Write some code!');
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch('/api/compiler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selected.language, code, input: '' })
      });
      const data = await res.json();
      setOutput({ ...data, mode: 'run' });
    } catch {
      toast.error('Server error. Is backend running?');
    } finally {
      setRunning(false);
    }
  }

  async function submitChallenge() {
    if (!code.trim()) return toast.error('Write some code!');
    setSubmitting(true);
    setOutput(null);
    try {
      const res = await fetch('/api/progress/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: selected.id, code, language: selected.language })
      });
      
      const data = await res.json();
      setOutput({ ...data, mode: 'submit', isCorrect: data.passed });

      if (data.passed) {
        if (!solved.includes(selected.id)) {
          setSolved(prev => [...prev, selected.id]);
          setUser(prev => ({ points: prev.points + (selected.difficulty === 'Hard' ? 30 : selected.difficulty === 'Medium' ? 20 : 10) }));
        }
        setSuccessModal({ 
          challenge: selected, 
          points: selected.difficulty === 'Hard' ? 30 : selected.difficulty === 'Medium' ? 20 : 10,
          total: solved.includes(selected.id) ? solved.length : solved.length + 1 
        });
      } else {
        toast.error('Wrong answer. Check your output!');
      }
    } catch (err) {
      toast.error('Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function getHint() {
    if (!code.trim()) return toast.error('Write some code first!');
    setReviewing(true);
    setReview(null);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: selected.language, challengeTitle: selected.title })
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReview(data.review);
    } catch {
      setReview(`💡 Hint: ${selected.hint}`);
    } finally {
      setReviewing(false);
    }
  }

  function nextChallenge() {
    setSuccessModal(null);
    const idx = challenges.findIndex(c => c.id === selected.id);
    if (idx < challenges.length - 1) selectChallenge(challenges[idx + 1]);
  }

  const filtered = challenges.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'solved') return solved.includes(c.id);
    if (filter === 'unsolved') return !solved.includes(c.id);
    return c.language === filter || c.difficulty === filter;
  });

  const pct = challenges.length > 0 ? Math.round((solved.length / challenges.length) * 100) : 0;

  return (
    <div style={{ height:'calc(100vh - 60px)', display:'flex', flexDirection:'column', overflow:'hidden', backgroundColor:'#f8fafc' }}>
      
      {/* Header */}
      <div style={{
        background:'white', borderBottom:'1px solid #e2e8f0',
        padding:'14px 24px', display:'flex', alignItems:'center',
        justifyContent:'space-between', flexWrap:'wrap', gap:12, flexShrink:0
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link href="/student" style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 12px', borderRadius:8, background:'#f1f5f9',
            color:'#475569', fontSize:13, fontWeight:700,
            textDecoration:'none', transition:'all 0.15s'
          }}>
            <span>⬅</span> Back
          </Link>
          <div style={{ width:1, height:24, background:'#e2e8f0' }}></div>
          <div>
            <div style={{ fontWeight:800, fontSize:20, color:'#0f172a' }}>🏆 Challenges</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
              50 challenges • JavaScript, Python, Java • Auto-graded • Copy/paste restricted
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:22, color:'#f97316', fontFamily:'monospace', lineHeight:1 }}>{user?.points || 0}</div>
            <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Points</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:22, color:'#0f172a', fontFamily:'monospace', lineHeight:1 }}>{solved.length}/50</div>
            <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Solved</div>
          </div>
          <div style={{ width:1, height:36, background:'#e2e8f0' }}></div>
          <Link href="/codelab" style={{
            padding:'8px 20px', borderRadius:8, background:'#16a34a', color:'white',
            fontWeight:700, fontSize:13, border:'none', display:'flex', alignItems:'center', gap:7,
            textDecoration:'none', boxShadow:'0 2px 8px rgba(22,163,74,0.25)', transition:'background 0.15s'
          }}><span>✏️</span> Free</Link>
          <button style={{
            padding:'8px 20px', borderRadius:8, background:'#0f172a', color:'white',
            fontWeight:700, fontSize:13, border:'none', cursor:'default',
            display:'flex', alignItems:'center', gap:7, boxShadow:'0 2px 8px rgba(15,23,42,0.18)'
          }}><span>🏆</span> Challenges</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background:'white', borderBottom:'1px solid #e2e8f0',
        padding:'8px 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0
      }}>
        <span style={{ fontSize:12, color:'#64748b', fontWeight:600, flexShrink:0 }}>Progress</span>
        <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${pct}%`, borderRadius:3,
            background:'linear-gradient(90deg, #f97316, #16a34a)',
            transition:'width 0.5s ease'
          }}></div>
        </div>
        <span style={{ fontSize:12, color:'#64748b', fontWeight:600, flexShrink:0 }}>{solved.length} / 50</span>
      </div>

      {/* Main layout */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', flex:1, overflow:'hidden' }}>

        {/* Challenge list */}
        <div style={{ background:'white', borderRight:'1px solid #e2e8f0', overflow:'auto', padding:12 }}>
          {/* Filters */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
            {[
              { val:'all', label:'All' },
              { val:'javascript', label:'JS' },
              { val:'python', label:'Python' },
              { val:'java', label:'Java' },
              { val:'Easy', label:'Easy' },
              { val:'Medium', label:'Medium' },
              { val:'Hard', label:'Hard' },
              { val:'solved', label:'✅ Solved' },
              { val:'unsolved', label:'🔲 Todo' },
            ].map(f => (
              <button key={f.val} onClick={() => setFilter(f.val)} style={{
                padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                border:`1px solid ${filter === f.val ? '#f97316' : '#e2e8f0'}`,
                background: filter === f.val ? '#fff7ed' : 'transparent',
                color: filter === f.val ? '#c2410c' : '#64748b',
                cursor:'pointer', transition:'all 0.15s'
              }}>{f.label}</button>
            ))}
          </div>

          {/* Challenge items */}
          {filtered.map(c => {
            const isSolved = solved.includes(c.id);
            const isActive = selected?.id === c.id;
            return (
              <div key={c.id} onClick={() => selectChallenge(c)} style={{
                padding:'10px 11px', borderRadius:8, marginBottom:4,
                border:`1px solid ${isActive ? '#f97316' : isSolved ? '#bbf7d0' : '#e2e8f0'}`,
                background: isActive ? '#fff7ed' : isSolved ? '#f0fdf4' : 'white',
                cursor:'pointer', transition:'all 0.15s',
                display:'flex', alignItems:'flex-start', gap:9
              }}>
                <div style={{
                  width:20, height:20, borderRadius:'50%', flexShrink:0, marginTop:1,
                  border:`2px solid ${isSolved ? '#16a34a' : '#e2e8f0'}`,
                  background: isSolved ? '#16a34a' : 'white',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, color:'white', fontWeight:700
                }}>{isSolved ? '✓' : ''}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {c.displayNumber}. {c.title}
                  </div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background:`rgba(${LANG_COLORS[c.language] === '#eab308' ? '234,179,8' : c.language === 'python' ? '37,99,235' : '249,115,22'},.12)`, color:LANG_COLORS[c.language] }}>
                      {LANG_LABELS[c.language]}
                    </span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background:DIFF_BG[c.difficulty], color:DIFF_COLORS[c.difficulty] }}>
                      {c.difficulty}
                    </span>
                    <span style={{ fontSize:10, color:'#64748b' }}>{c.category}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'30px 0', color:'#64748b', fontSize:13 }}>
              No challenges match the filter.
            </div>
          )}
        </div>

        {/* Challenge detail / editor */}
        {!selected ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'#64748b', background:'#f8fafc' }}>
            <span style={{ fontSize:48 }}>👈</span>
            <span style={{ fontSize:16, fontWeight:600 }}>Select a challenge to start</span>
            <span style={{ fontSize:13 }}>Choose from 50 challenges across JS, Python, and Java</span>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', background:'white', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <h2 style={{ fontSize:17, fontWeight:800, color:'#0f172a', marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
                    {selected.displayNumber}. {selected.title}
                    {solved.includes(selected.id) && <span style={{ fontSize:13, color:'#16a34a', fontWeight:700 }}>✅ Solved</span>}
                  </h2>
                  <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:`rgba(${selected.language === 'javascript' ? '234,179,8' : selected.language === 'python' ? '37,99,235' : '249,115,22'},.12)`, color:LANG_COLORS[selected.language] }}>
                      {LANG_LABELS[selected.language]}
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:DIFF_BG[selected.difficulty], color:DIFF_COLORS[selected.difficulty] }}>
                      {selected.difficulty}
                    </span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:'#f1f5f9', color:'#64748b', fontWeight:600 }}>
                      {selected.category}
                    </span>
                  </div>
                  <p style={{ fontSize:14, color:'#475569', lineHeight:1.6 }}>{selected.description}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowHint(!showHint)} style={{
                  padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:700,
                  border:'1px solid #fed7aa', background:'#fff7ed',
                  color:'#c2410c', cursor:'pointer'
                }}>{showHint ? '🙈 Hide Hint' : '💡 Show Hint'}</button>
              </div>
              {showHint && (
                <div style={{
                  marginTop:10, padding:'10px 14px', borderLeft:'3px solid #f97316',
                  background:'#fff7ed', borderRadius:'0 8px 8px 0',
                  fontSize:13, color:'#64748b', lineHeight:1.6
                }}>{selected.hint}</div>
              )}
            </div>

            <div style={{
              background:'white', borderBottom:'1px solid #e2e8f0',
              padding:'8px 14px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', flexShrink:0
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:LANG_COLORS[selected.language] }}></div>
                <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>
                  {{ javascript:'JavaScript', python:'Python', java:'Java' }[selected.language]}
                </span>
              </div>
              <span style={{
                fontSize:11, padding:'2px 9px', borderRadius:4, fontWeight:700,
                background:'#fee2e2', color:'#ef4444', border:'1px solid #fecaca'
              }}>🚫 Paste restricted</span>
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                <button onClick={getHint} disabled={reviewing} style={{ ...btnBase2, background:'#fff7ed', color:'#c2410c', border:'1px solid #fed7aa' }}>
                  {reviewing ? <span>Wait...</span> : '🤖 AI Hint'}
                </button>
                <button onClick={runChallenge} disabled={running} style={{ ...btnBase2, background:'#0284c7', color:'white' }}>
                  {running ? <span>Running...</span> : '▶ Run'}
                </button>
                <button onClick={submitChallenge} disabled={submitting} style={{ ...btnBase2, background:'#f97316', color:'white' }}>
                  {submitting ? <span>Checking...</span> : '✔ Submit'}
                </button>
              </div>
            </div>

            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0, background:'white' }}>
              <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:'200px' }}>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={selected.language}
                  blockPaste={true}
                />
              </div>

              {output && (
                <div style={{ borderTop:'1px solid #e2e8f0', background:'white', flexShrink:0 }}>
                  <div style={{
                    padding:'6px 14px', borderBottom:'1px solid #e2e8f0',
                    display:'flex', alignItems:'center', gap:10
                  }}>
                    <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b' }}>
                      {output.mode === 'submit' ? 'Submission Result' : 'Output'}
                    </span>
                    {output.mode === 'submit' ? (
                      <span style={{
                        fontSize:11, padding:'2px 9px', borderRadius:4, fontWeight:700,
                        background: output.isCorrect ? '#dcfce7' : '#fee2e2',
                        color: output.isCorrect ? '#16a34a' : '#ef4444',
                        border: `1px solid ${output.isCorrect ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        {output.isCorrect ? '✅ Correct!' : '❌ Wrong Answer'}
                      </span>
                    ) : (
                      <span style={{
                        fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:700,
                        background: output.success ? '#dcfce7' : '#fee2e2',
                        color: output.success ? '#16a34a' : '#ef4444',
                        border: `1px solid ${output.success ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        {output.success ? '✓ Ran' : '✗ Error'}
                      </span>
                    )}
                    <button onClick={() => setOutput(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#64748b' }}>×</button>
                  </div>
                  <pre style={{
                    padding:'10px 14px', fontFamily:'monospace', fontSize:12,
                    lineHeight:1.6, maxHeight:160, overflowY:'auto', margin:0,
                    color: (output.isCorrect || output.success) ? '#1e293b' : '#ef4444',
                    whiteSpace:'pre-wrap', wordBreak:'break-all'
                  }}>
                    {output.output || output.error || '(no output)'}
                    {output.mode === 'submit' && !output.isCorrect && output.expected && (
                      <span style={{ color:'#64748b', display:'block', marginTop:8 }}>
                        {`\nExpected:\n${output.expected}`}
                      </span>
                    )}
                  </pre>
                </div>
              )}

              {review && (
                <div style={{ borderTop:'1px solid #e2e8f0', background:'#fffbf5', flexShrink:0 }}>
                  <div style={{ padding:'6px 14px', borderBottom:'1px solid #fed7aa', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#f97316' }}>🤖 AI Hint</span>
                    <button onClick={() => setReview(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#64748b' }}>×</button>
                  </div>
                  <pre style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:12, lineHeight:1.7, maxHeight:160, overflowY:'auto', color:'#0f172a', whiteSpace:'pre-wrap', margin:0 }}>
                    {review}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {successModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:500
        }} onClick={() => setSuccessModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'white', borderRadius:20, padding:'36px 32px',
            maxWidth:400, width:'90%', textAlign:'center',
            boxShadow:'0 10px 25px rgba(0,0,0,0.1)',
            border:'2px solid #bbf7d0'
          }}>
            <div style={{ fontSize:52, marginBottom:10 }}>🎉</div>
            <h2 style={{ fontSize:22, fontWeight:800, color:'#16a34a', marginBottom:8 }}>Challenge Complete!</h2>
            <p style={{ color:'#64748b', fontSize:14, marginBottom:6, lineHeight:1.6 }}>
              You solved <strong style={{ color:'#0f172a' }}>{successModal.challenge.title}</strong>!
            </p>
            {successModal.points > 0 && (
              <div style={{
                display:'inline-block', padding:'6px 16px', borderRadius:20,
                background:'#fff7ed', border:'1px solid #fed7aa',
                color:'#c2410c', fontWeight:700, fontSize:14, marginBottom:16
              }}>+{successModal.points} points earned! 🌟</div>
            )}
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
              Total solved: {successModal.total} / 50
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={nextChallenge} style={{
                padding:'10px 20px', borderRadius:8, background:'#f97316',
                color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer'
              }}>Next Challenge →</button>
              <button onClick={() => setSuccessModal(null)} style={{
                padding:'10px 20px', borderRadius:8, border:'1px solid #e2e8f0',
                background:'white', fontWeight:700, fontSize:14, cursor:'pointer', color:'#64748b'
              }}>Stay Here</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnBase2 = { padding:'6px 13px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, border:'none' };
