import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import api from '../utils/api';

const LANG_META = {
  javascript: { label:'JavaScript', monacoLang:'javascript', color:'#F7DF1E' },
  python:     { label:'Python',     monacoLang:'python',     color:'#3776AB' },
  java:       { label:'Java',       monacoLang:'java',       color:'#ED8B00' },
  cpp:        { label:'C++',        monacoLang:'cpp',        color:'#00599C' },
  html:       { label:'HTML',       monacoLang:'html',       color:'#E34F26' },
  css:        { label:'CSS',        monacoLang:'css',        color:'#1572B6' },
  bash:       { label:'Bash',       monacoLang:'shell',      color:'#4EAA25' },
  yaml:       { label:'YAML',       monacoLang:'yaml',       color:'#CB171E' },
};

const diffColor = { Easy:'text-green-400', Medium:'text-yellow-400', Hard:'text-red-400' };
const statusColor = {
  Accepted:             { bg:'bg-green-500/15',  border:'border-green-500/40',  text:'text-green-400',  icon:'✓' },
  'Wrong Answer':       { bg:'bg-red-500/15',    border:'border-red-500/40',    text:'text-red-400',    icon:'✗' },
  'Runtime Error':      { bg:'bg-orange-500/15', border:'border-orange-500/40', text:'text-orange-400', icon:'⚠' },
  'Time Limit Exceeded':{ bg:'bg-yellow-500/15', border:'border-yellow-500/40', text:'text-yellow-400', icon:'⏱' },
  'Compile Error':      { bg:'bg-red-500/15',    border:'border-red-500/40',    text:'text-red-400',    icon:'✗' },
};

export default function EditorPage() {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [outputTab, setOutputTab] = useState('output');

  useEffect(() => {
    api.get(`/problems/${problemId}`).then(res => {
      const p = res.data;
      setProblem(p);
      const lang = p.language || 'javascript';
      setLanguage(lang);
      const starter = p.starterCode instanceof Object ? p.starterCode[lang] : '';
      setCode(starter || getDefaultStarter(lang));
    }).catch(console.error);
  }, [problemId]);

  const getDefaultStarter = (lang) => {
    const starters = {
      javascript: '// Write your solution here\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on("line", (line) => {\n  console.log(line.trim());\n});',
      python: '# Write your solution here\nimport sys\nfor line in sys.stdin:\n    print(line.strip())',
      java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        while(sc.hasNextLine()) {\n            System.out.println(sc.nextLine());\n        }\n    }\n}',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    string line;\n    while(getline(cin, line)) {\n        cout << line << endl;\n    }\n    return 0;\n}',
      html: '<!DOCTYPE html>\n<html>\n<head><title>Solution</title></head>\n<body>\n  <!-- Your HTML here -->\n</body>\n</html>',
      css: '/* Your CSS solution here */\nbody { margin: 0; font-family: Arial, sans-serif; }',
      bash: '#!/bin/bash\nread input\necho "$input"',
      yaml: '# Your YAML here\nversion: "3.8"\nservices:\n  app:\n    image: nginx:latest',
    };
    return starters[lang] || '// Write your solution here';
  };

  const handleLangChange = (newLang) => {
    setLanguage(newLang);
    if (problem?.starterCode) {
      const starterMap = problem.starterCode instanceof Map ? Object.fromEntries(problem.starterCode) : problem.starterCode;
      setCode(starterMap[newLang] || getDefaultStarter(newLang));
    } else {
      setCode(getDefaultStarter(newLang));
    }
    setOutput(null);
    setSubmission(null);
  };

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    setOutputTab('output');
    try {
      console.log("Running code...");
      const { data } = await api.post('/code/run', { code, language });
      console.log("Run response:", data);
      setOutput(data);
      setOutputTab('output');
    } catch (err) {
      console.error("Run error:", err);
      setOutput({ stderr: err.response?.data?.message || 'Execution failed', status: { description: 'Error' } });
      setOutputTab('output');
    } finally { setRunning(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmission(null);
    setOutputTab('result');
    try {
      const { data } = await api.post('/submissions', { problemId, code, language });
      setSubmission(data);
    } catch (err) {
      setSubmission({ status: 'Runtime Error', error: err.response?.data?.message || 'Submission failed' });
    } finally { setSubmitting(false); }
  };

  if (!problem) return (
    <div className="flex items-center justify-center h-screen bg-surface-900">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const langMeta = LANG_META[language] || LANG_META.javascript;
  const allowedLangs = problem.allowedLanguages?.length ? problem.allowedLanguages : [language];
  const submissionColors = submission ? (statusColor[submission.status] || statusColor['Wrong Answer']) : null;

  return (
    <div className="flex flex-col h-screen bg-surface-900 overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 glass-dark border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white transition-colors text-sm">← Back</button>
        <div className="w-px h-5 bg-white/10"/>
        <h1 className="font-medium text-white text-sm truncate">{problem.title}</h1>
        <span className={`text-xs font-mono ${diffColor[problem.difficulty] || 'text-slate-400'}`}>{problem.difficulty}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">{problem.submissionCount} submissions</span>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[42%] flex flex-col border-r border-white/5 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5 shrink-0">
            {['description','hints','examples'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab ? 'text-white border-b-2 border-brand-500' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div key="desc" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-body">
                      {problem.description?.replace(/##\s*/g, '').replace(/\*\*/g, '')}
                    </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'hints' && (
                <motion.div key="hints" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-3">
                  <h3 className="text-white font-medium text-sm mb-4">💡 Hints</h3>
                  {(problem.hints || []).map((h, i) => (
                    <div key={i} className="glass rounded-lg p-3.5 border border-yellow-400/10">
                      <div className="flex gap-2">
                        <span className="text-yellow-400 font-mono text-xs mt-0.5">#{i+1}</span>
                        <p className="text-slate-300 text-sm">{h}</p>
                      </div>
                    </div>
                  ))}
                  {(!problem.hints || problem.hints.length === 0) && <p className="text-slate-500 text-sm">No hints available.</p>}
                </motion.div>
              )}
              {activeTab === 'examples' && (
                <motion.div key="ex" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                  <h3 className="text-white font-medium text-sm mb-4">📝 Examples</h3>
                  {(problem.examples || []).map((ex, i) => (
                    <div key={i} className="glass rounded-lg p-4 border border-white/5 space-y-2">
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Input</span>
                        <pre className="text-green-400 text-xs font-mono mt-1 bg-black/20 p-2 rounded">{ex.input}</pre>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Output</span>
                        <pre className="text-blue-400 text-xs font-mono mt-1 bg-black/20 p-2 rounded">{ex.output}</pre>
                      </div>
                      {ex.explanation && (
                        <div>
                          <span className="text-xs text-slate-500 uppercase tracking-wider">Explanation</span>
                          <p className="text-slate-400 text-xs mt-1">{ex.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Toolbar */}
          <div className="h-11 bg-surface-800 border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
            {/* Language selector */}
            <div className="flex items-center gap-1 bg-surface-900 rounded-lg p-0.5">
              {allowedLangs.map(lang => (
                <button key={lang} onClick={() => handleLangChange(lang)}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                    language === lang
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  style={language === lang ? { color: LANG_META[lang]?.color } : {}}>
                  {LANG_META[lang]?.label || lang}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleRun} disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                {running ? <span className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin"/> : '▶'}
                {running ? 'Running...' : 'Run'}
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/15 border border-brand-500/30 text-brand-400 rounded-lg text-xs font-medium hover:bg-brand-500/25 transition-all disabled:opacity-50">
                {submitting ? <span className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin"/> : '↑'}
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={langMeta.monacoLang}
              value={code}
              onChange={(val) => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: '"JetBrains Mono", monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                padding: { top: 12 },
                renderLineHighlight: 'line',
                bracketPairColorization: { enabled: true },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
              }}
            />
          </div>

          {/* Output Panel */}
          <div className="h-44 border-t border-white/5 bg-surface-800 flex flex-col shrink-0">
            {/* Output Tabs */}
            <div className="flex items-center border-b border-white/5 px-2 shrink-0">
              {['output','result'].map(t => (
                <button key={t} onClick={() => setOutputTab(t)}
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    outputTab === t ? 'text-white border-b-2 border-brand-500' : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  {t === 'output' ? '▶ Run Output' : '↑ Submit Result'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
              {outputTab === 'output' && (
                <>
                  {running && <div className="text-slate-400 flex items-center gap-2"><span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"/>Executing...</div>}
                  {!running && !output && <div className="text-slate-600">Run your code to see output here</div>}
                  {output && (
                    <div className="space-y-2">
                      <div className="text-slate-500">Status: <span className="text-white">{output.status?.description}</span></div>
                      {output.stdout && <div><span className="text-green-400">stdout:</span><pre className="text-slate-300 mt-1 whitespace-pre-wrap">{output.stdout}</pre></div>}
                      {output.stderr && <div><span className="text-red-400">stderr:</span><pre className="text-red-300 mt-1 whitespace-pre-wrap">{output.stderr}</pre></div>}
                      {output.compile_output && <div><span className="text-yellow-400">compile:</span><pre className="text-yellow-300 mt-1 whitespace-pre-wrap">{output.compile_output}</pre></div>}
                      {output.time && <div className="text-slate-500">Time: {output.time}s {output.memory && `| Memory: ${output.memory}KB`}</div>}
                    </div>
                  )}
                </>
              )}
              {outputTab === 'result' && (
                <>
                  {submitting && <div className="text-slate-400 flex items-center gap-2"><span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"/>Judging...</div>}
                  {!submitting && !submission && <div className="text-slate-600">Submit your code to see results here</div>}
                  {submission && submissionColors && (
                    <div className={`rounded-lg p-3 border ${submissionColors.bg} ${submissionColors.border}`}>
                      <div className={`font-bold text-sm ${submissionColors.text} flex items-center gap-2 mb-2`}>
                        <span>{submissionColors.icon}</span>
                        {submission.status}
                      </div>
                      {submission.testCasesPassed !== undefined && (
                        <div className="text-slate-400 text-xs">
                          Test Cases: {submission.testCasesPassed}/{submission.totalTestCases} passed
                        </div>
                      )}
                      {submission.output && <pre className="text-slate-300 mt-2 text-xs whitespace-pre-wrap">{submission.output}</pre>}
                      {submission.error && <pre className="text-red-300 mt-2 text-xs whitespace-pre-wrap">{submission.error}</pre>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
