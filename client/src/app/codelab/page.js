"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CodeEditor from '../../components/codelab/CodeEditor';
import toast from 'react-hot-toast';

const LANGS = [
  { id:'javascript', label:'JavaScript', dot:'#eab308', file:'playground.js' },
  { id:'python',     label:'Python',     dot:'#2563eb', file:'playground.py' },
  { id:'java',       label:'Java',       dot:'#f97316', file:'playground.java' },
  { id:'cpp',        label:'C++',        dot:'#8b5cf6', file:'playground.cpp' },
];

const DEFAULTS = {
  javascript: `// JavaScript Free Compiler\nconsole.log("Hello from NestJS/NextJS CodeLab!");\n\nconst nums = [1, 2, 3, 4, 5];\nconst sum = nums.reduce((a, b) => a + b, 0);\nconsole.log("Sum:", sum);\nconsole.log("Squares:", nums.map(x => x * x));`,
  python: `# Python Free Compiler\nprint("Hello from CodeLab!")\n\nnums = [1, 2, 3, 4, 5]\nprint("Sum:", sum(nums))\nprint("Squares:", [x**2 for x in nums])`,
  java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter a number: ");\n        if(sc.hasNextInt()) {\n           int num = sc.nextInt();\n           System.out.println("You entered: " + num);\n        }\n    }\n}`,
  cpp: `#include <iostream>\n#include <vector>\n#include <numeric>\nusing namespace std;\n\nint main() {\n    cout << "Hello from CodeLab!" << endl;\n    vector<int> nums = {1, 2, 3, 4, 5};\n    int sum = accumulate(nums.begin(), nums.end(), 0);\n    cout << "Sum: " << sum << endl;\n    return 0;\n}`,
};

export default function CodeLabPage() {
  const [lang, setLang] = useState('javascript');
  const [codes, setCodes] = useState({ ...DEFAULTS });
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  async function fetchProgress() {
    try {
      const res = await fetch('/api/progress/me', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function runCode() {
    const code = codes[lang].trim();
    if (!code) return toast.error('Write some code first!');
    
    setRunning(true);
    setOutput(null);
    setReview(null);
    
    try {
      const res = await fetch('/api/compiler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, code, input: stdin })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.message || data.error || 'Execution failed');
        setOutput({ success: false, output: '', error: data.message || 'Execution failed' });
        return;
      }

      setOutput(data);
      if (data.success) toast.success('Code ran successfully!');
      else toast.error('Check output for errors');
    } catch (err) {
      toast.error('Server error. Is the backend running?');
    } finally {
      setRunning(false);
    }
  }

  async function getReview() {
    const code = codes[lang].trim();
    if (!code) return toast.error('Write some code first!');
    
    setReviewing(true);
    setReview(null);
    
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang })
      });
      
      if (!res.ok) throw new Error('Review failed');
      const data = await res.json();
      setReview(data.review);
    } catch {
      setReview('Server offline. Could not get review.');
      toast.error('Could not get AI review');
    } finally {
      setReviewing(false);
    }
  }

  const currentLang = LANGS.find(l => l.id === lang);
  const solvedCount = progress?.solvedChallenges?.length || 0;
  const points = progress?.points || 0;

  return (
    <div style={{ height:'calc(100vh - 60px)', display:'flex', flexDirection:'column', overflow:'hidden', backgroundColor: '#f8fafc' }}>
      {/* Header bar */}
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
            <div style={{ fontWeight:800, fontSize:20, color:'#0f172a', display:'flex', alignItems:'center', gap:8 }}>
              💻 Code Lab
            </div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
              JS • Python • Java • C++ — all run natively on the server
            </div>
          </div>
          <span style={{
            background:'#dcfce7', color:'#16a34a',
            border:'1px solid #bbf7d0',
            borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700,
            whiteSpace:'nowrap'
          }}>✅ Free Mode — copy/paste ON</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:22, color:'#f97316', fontFamily:'monospace', lineHeight:1 }}>
              {points}
            </div>
            <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Points</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:22, color:'#0f172a', fontFamily:'monospace', lineHeight:1 }}>
              {solvedCount}/50
            </div>
            <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Solved</div>
          </div>
          <div style={{ width:1, height:36, background:'#e2e8f0' }}></div>
          <button style={{
            padding:'8px 20px', borderRadius:8,
            background:'#16a34a', color:'white',
            fontWeight:700, fontSize:13, border:'none', cursor:'default',
            display:'flex', alignItems:'center', gap:7,
            boxShadow:'0 2px 8px rgba(22,163,74,0.25)'
          }}>
            <span>✏️</span> Free
          </button>
          <Link href="/challenges" style={{
            padding:'8px 20px', borderRadius:8,
            background:'#0f172a', color:'white',
            fontWeight:700, fontSize:13, border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', gap:7,
            textDecoration:'none',
            boxShadow:'0 2px 8px rgba(15,23,42,0.18)',
            transition:'background 0.15s'
          }}>
            <span>🏆</span> Challenges
          </Link>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', flex:1, overflow:'hidden' }}>
        {/* Left info panel */}
        <div style={{
          background:'white', borderRight:'1px solid #e2e8f0',
          overflow:'auto', padding:16, display:'flex', flexDirection:'column', gap:14
        }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#64748b', marginBottom:8 }}>✏️ Free Compiler</div>
            <p style={{ fontSize:12, color:'#64748b', lineHeight:1.6, marginBottom:12 }}>
              Your personal sandbox. Paste, experiment, and run any code!
            </p>
            {[
              { icon:'✅', title:'Copy/paste fully enabled', desc:'Paste code from anywhere' },
              { icon:'🚀', title:'All 4 languages work', desc:'JS, Python, Java, C++ run natively' },
              { icon:'⚡', title:'No API keys needed', desc:'Code runs directly on the server' },
            ].map(f => (
              <div key={f.title} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'9px 10px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, marginBottom:6 }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{f.title}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:12 }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#64748b', marginBottom:8 }}>Available Runtimes</div>
            {[
              { name:'JavaScript', ver:'Node.js', dot:'#eab308' },
              { name:'Python',     ver:'Python 3+', dot:'#2563eb' },
              { name:'Java',       ver:'JDK',        dot:'#f97316' },
              { name:'C++',        ver:'GCC',        dot:'#8b5cf6' },
            ].map(r => (
              <div key={r.name} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'7px 0', borderBottom:'1px solid #e2e8f0', fontSize:12
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, fontWeight:600, color:'#0f172a' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:r.dot, flexShrink:0 }}></div>
                  {r.name}
                </div>
                <span style={{ color:'#64748b', fontFamily:'monospace', fontSize:11 }}>{r.ver}</span>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#64748b', marginBottom:8 }}>stdin Input (optional)</div>
            <textarea
              value={stdin}
              onChange={e => setStdin(e.target.value)}
              placeholder="Enter program input here..."
              style={{
                width:'100%', padding:'8px 10px', minHeight:64, resize:'vertical',
                border:'1px solid #e2e8f0', borderRadius:8,
                fontFamily:'monospace', fontSize:12, color:'#0f172a',
                background:'#f8fafc', outline:'none'
              }}
            />
          </div>
        </div>

        {/* Editor area */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{
            background:'white', borderBottom:'1px solid #e2e8f0',
            padding:'8px 14px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', flexShrink:0
          }}>
            {LANGS.map(l => (
              <button key={l.id} onClick={() => setLang(l.id)} style={{
                padding:'6px 14px', borderRadius:8,
                border: lang === l.id ? '2px solid #0f172a' : '1px solid #e2e8f0',
                background: lang === l.id ? '#0f172a' : 'white',
                color: lang === l.id ? 'white' : '#64748b',
                fontWeight:700, fontSize:13, cursor:'pointer',
                display:'flex', alignItems:'center', gap:6, transition:'all 0.15s'
              }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: lang === l.id ? 'white' : l.dot }}></div>
                {l.label}
              </button>
            ))}

            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button onClick={runCode} disabled={running} style={{
                padding:'7px 18px', borderRadius:8, background:'#16a34a', color:'white',
                fontWeight:700, fontSize:13, border:'none', cursor: running ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:6, opacity: running ? 0.7 : 1,
                boxShadow:'0 1px 4px rgba(22,163,74,0.3)', transition:'all 0.15s'
              }}>
                {running ? <span>Running...</span> : <span>▶ Run</span>}
              </button>
              <button onClick={() => toast('Submit is for Challenges mode!', { icon: 'ℹ️' })} style={{
                padding:'7px 18px', borderRadius:8, background:'#f97316', color:'white',
                fontWeight:700, fontSize:13, border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', gap:6,
                boxShadow:'0 1px 4px rgba(249,115,22,0.3)', transition:'all 0.15s'
              }}>
                <span>📤 Submit</span>
              </button>
              <button onClick={getReview} disabled={reviewing} style={{
                padding:'7px 18px', borderRadius:8, background:'#0f172a', color:'white',
                fontWeight:700, fontSize:13, border:'none', cursor: reviewing ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:6, opacity: reviewing ? 0.7 : 1,
                boxShadow:'0 1px 4px rgba(15,23,42,0.2)', transition:'all 0.15s'
              }}>
                {reviewing ? <span>Analyzing...</span> : <span>🤖 Review</span>}
              </button>
            </div>
          </div>

          <div style={{
            background:'#1e2a4a', borderBottom:'1px solid #2d3d6b',
            padding:'6px 16px', display:'flex', alignItems:'center', gap:10,
            fontFamily:'monospace', fontSize:12, color:'#94a3b8', flexShrink:0
          }}>
            <span style={{ color:'#cbd5e1', fontWeight:500 }}>{currentLang?.file}</span>
            <span style={{
              marginLeft:'auto', color:'#16a34a', background:'rgba(34,197,94,0.12)',
              border:'1px solid rgba(34,197,94,0.3)', padding:'1px 9px',
              borderRadius:4, fontSize:11, fontWeight:700
            }}>✅ Paste allowed</span>
          </div>

          {/* Editor Core Component */}
          <CodeEditor
            value={codes[lang]}
            onChange={v => setCodes(p => ({ ...p, [lang]: v }))}
            language={lang}
            blockPaste={false}
          />

          {/* Output Bottom Panel */}
          {output !== null && (
            <div style={{ borderTop:'1px solid #e2e8f0', background:'white', flexShrink:0 }}>
              <div style={{
                padding:'6px 16px', borderBottom:'1px solid #e2e8f0',
                display:'flex', alignItems:'center', gap:10
              }}>
                <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b' }}>Output</span>
                <span style={{
                  fontSize:11, padding:'2px 9px', borderRadius:4, fontFamily:'monospace', fontWeight:700,
                  background: output.success ? '#dcfce7' : '#fee2e2',
                  color: output.success ? '#16a34a' : '#ef4444',
                  border: `1px solid ${output.success ? '#bbf7d0' : '#fecaca'}`
                }}>
                  {output.success ? '✓ Success' : '✗ Error'}{output.execTime ? ` • ${output.execTime}ms` : ''}
                </span>
                <button onClick={() => setOutput(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
              </div>
              <pre style={{
                padding:'12px 16px', fontFamily:'monospace', fontSize:13,
                lineHeight:1.65, maxHeight:200, overflowY:'auto',
                color: output.success ? '#1e293b' : '#ef4444',
                whiteSpace:'pre-wrap', wordBreak:'break-all', margin:0
              }}>
                {output.output || output.error || '(no output)'}
                {output.output && output.error && (
                  <span style={{ color:'#eab308' }}>{'\n[stderr]: ' + output.error}</span>
                )}
              </pre>
            </div>
          )}

          {/* AI Review Bottom Panel */}
          {review && (
            <div style={{ borderTop:'1px solid #e2e8f0', background:'#fffbf5', flexShrink:0 }}>
              <div style={{
                padding:'6px 16px', borderBottom:'1px solid #fed7aa',
                display:'flex', alignItems:'center', gap:8
              }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#f97316' }}>🤖 AI Code Review</span>
                <button onClick={() => setReview(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18 }}>×</button>
              </div>
              <pre style={{
                padding:'12px 16px', fontFamily:'monospace', fontSize:12,
                lineHeight:1.7, maxHeight:180, overflowY:'auto',
                color:'#0f172a', whiteSpace:'pre-wrap', margin:0
              }}>{review}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
