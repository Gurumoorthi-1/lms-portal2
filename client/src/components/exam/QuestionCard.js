'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CheckCircle2, X } from 'lucide-react';

const OptionButton = memo(({ option, state, onClick }) => {
  const wrapCls = {
    idle: 'border-[#E2E8F0] bg-white hover:border-[#2563EB] hover:bg-[#EFF6FF]',
    selected: 'border-[#2563EB] bg-[#EFF6FF]',
    correct: 'border-[#22C55E] bg-[#F0FDF4]',
    wrong: 'border-[#EF4444] bg-[#FEF2F2]',
  };
  const letterCls = {
    idle: 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] group-hover:border-[#2563EB] group-hover:text-[#2563EB]',
    selected: 'border-[#2563EB] bg-[#2563EB] text-white',
    correct: 'border-[#22C55E] bg-[#22C55E] text-white',
    wrong: 'border-[#EF4444] bg-[#EF4444] text-white',
  };
  const textCls = {
    idle: 'text-[#0F172A]',
    selected: 'text-[#1D4ED8] font-bold',
    correct: 'text-[#15803D] font-bold',
    wrong: 'text-[#B91C1C] font-bold',
  };

  return (
    <motion.button
      onClick={(e) => onClick(option.id, e)}
      whileHover={state === 'idle' ? { scale: 1.01 } : {}}
      whileTap={state === 'idle' ? { scale: 0.98 } : {}}
      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all cursor-pointer group ${wrapCls[state]}`}
    >
      <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-sm font-black shrink-0 transition-all ${letterCls[state]}`}>
        {String(option.id).toUpperCase()}
      </div>
      <span className={`flex-1 text-base font-medium leading-snug transition-colors ${textCls[state]}`}>
        {option.text}
      </span>
      <AnimatePresence>
        {state === 'correct' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <CheckCircle2 size={22} className="text-[#22C55E] shrink-0" />
          </motion.div>
        )}
        {state === 'wrong' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <X size={22} className="text-[#EF4444] shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

OptionButton.displayName = 'OptionButton';

/* ── Zoomable Question Image ─────────────────────────────────── */
const QuestionImage = ({ src, alt }) => {
  const [zoomed, setZoomed] = React.useState(false);

  return (
    <>
      <motion.div
        className="relative my-6 rounded-2xl overflow-hidden border-2 border-[#E2E8F0] shadow-lg cursor-zoom-in group max-w-2xl"
        whileHover={{ scale: 1.01 }}
        onClick={() => setZoomed(true)}
      >
        <img
          src={src}
          alt={alt || 'Question image'}
          className="w-full h-auto object-contain max-h-[400px] bg-[#F8FAFC]"
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-[#64748B] shadow-sm">
            Click to enlarge
          </div>
        </div>
      </motion.div>

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomed(false)}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              src={src}
              alt={alt || 'Question image'}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
              className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ── Styled Code Block (dark terminal look) ──────────────────── */
const CodeBlock = ({ language, children, ...props }) => (
  <div className="relative my-8 group select-none pointer-events-none">
    <div className="relative overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 bg-[#020617]">
      <div className="bg-[#0f172a] border-b border-white/5 px-5 py-3.5 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] opacity-80" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] opacity-80" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] opacity-80" />
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language}</div>
      </div>
      <div className="p-0">
        <SyntaxHighlighter
          style={{
            ...atomDark,
            'pre[class*="language-"]': {
              ...atomDark['pre[class*="language-"]'],
              background: 'transparent',
              margin: 0,
              padding: '32px',
              fontSize: '15px',
              lineHeight: '1.6',
              fontFamily: '"Fira Code", "JetBrains Mono", monospace',
              userSelect: 'none'
            }
          }}
          language={language}
          PreTag="div"
          customStyle={{ backgroundColor: 'transparent' }}
          {...props}
        >
          {(Array.isArray(children) ? children.join('') : String(children ?? '')).replace(/\\n/g, '\n').replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    </div>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 rounded-2xl blur-xl -z-10 group-hover:opacity-100 transition-opacity opacity-0" />
  </div>
);

/* ── react-markdown v10 compatible components ────────────────── */
const markdownComponents = {
  // v10: `pre` wraps block code — we render CodeBlock here directly
  pre({ node, children, ...props }) {
    // children is the <code> element rendered by react-markdown
    // Extract language and code text from the child <code> element
    if (React.isValidElement(children)) {
      const codeProps = children.props || {};
      const className = codeProps.className || '';
      const match = /language-(\w+)/.exec(className);
      const language = match ? match[1] : 'javascript';
      // children can be a string or array in ReactMarkdown v10 — join to get full code
      const rawCode = codeProps.children;
      const codeText = Array.isArray(rawCode) ? rawCode.join('') : (rawCode || '');
      return <CodeBlock language={language}>{codeText}</CodeBlock>;
    }
    // Fallback: render as-is
    return <pre {...props}>{children}</pre>;
  },

  // v10: `code` outside of `pre` = inline code only (block code is handled by `pre` above)
  code({ node, className, children, ...props }) {
    // Since we handle block code in `pre`, this is always inline code
    return (
      <code className="bg-blue-50 text-[#2563EB] px-1.5 py-0.5 rounded-md font-black text-[0.9em] border border-blue-100" {...props}>
        {children}
      </code>
    );
  },

  // Image support
  img({ node, src, alt, ...props }) {
    return <QuestionImage src={src} alt={alt} />;
  },

  // Prevent <img> from being wrapped in <p> (invalid HTML nesting)
  p({ node, children, ...props }) {
    const childArray = React.Children.toArray(children);
    const hasBlock = childArray.some(
      (child) => React.isValidElement(child) && (child.type === QuestionImage || child.type === 'img')
    );
    if (hasBlock) return <>{children}</>;
    return <p {...props}>{children}</p>;
  },
};

/* ── Main QuestionCard ───────────────────────────────────────── */
const QuestionCard = ({ question, currentIdx, totalQuestions, selectedAnswer, onSelect, direction }) => {
  // Support multiple image field names
  const questionImageUrl = question.image || question.imageUrl || question.questionImage || question.img || null;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-12">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-black text-[#64748B] uppercase tracking-widest bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1 rounded-lg">
          Question {currentIdx + 1} / {totalQuestions}
        </span>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentIdx}
          custom={direction}
          initial={{ opacity: 0, x: direction * 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -30 }}
          transition={{ duration: 0.25 }}
          className="flex-1"
        >
          <div className="prose prose-slate max-w-none mb-10">
            <div className="text-2xl md:text-3xl font-bold text-[#0F172A] leading-snug">
              <ReactMarkdown components={markdownComponents}>
                {[
                  question.text,
                  question.codeSnippet ? `\n\n\`\`\`${question.language || 'javascript'}\n${String(question.codeSnippet).replace(/\\n/g, '\n')}\n\`\`\`` : '',
                  question.code ? `\n\n\`\`\`${question.language || 'javascript'}\n${String(question.code).replace(/\\n/g, '\n')}\n\`\`\`` : '',
                  question.snippet ? `\n\n\`\`\`${question.language || 'javascript'}\n${String(question.snippet).replace(/\\n/g, '\n')}\n\`\`\`` : ''
                ].filter(Boolean).join('\n')}
              </ReactMarkdown>
            </div>

            {/* Standalone question image from question.image / question.imageUrl field */}
            {questionImageUrl && (
              <QuestionImage src={questionImageUrl} alt={`Image for question ${currentIdx + 1}`} />
            )}
          </div>

          <div className="space-y-3 max-w-3xl">
            {question.options.map((opt) => (
              <OptionButton
                key={opt.id}
                option={opt}
                state={selectedAnswer === opt.id ? 'selected' : 'idle'}
                onClick={onSelect}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default memo(QuestionCard);
