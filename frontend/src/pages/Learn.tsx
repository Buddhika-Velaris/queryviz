import { useState, useMemo, useEffect, useRef, ReactNode, Children, createContext, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  BookOpen, Search, ChevronRight, Sparkles, Send, Loader2, MessageCircle, X,
  Brain, FlaskConical, Layers, Check, RotateCcw, Eye, EyeOff, Lock,
} from 'lucide-react';
import content from '../../../knowledge.md?raw';

// Context that gates AI-powered features to @velaris.io users only.
const VelarisUserCtx = createContext(false);
const VELARIS_DOMAIN = '@velaris.io';
import {
  summarizeSection, askAboutSection, explainTerm,
  generateQuiz, generateScenario, gradeSqlAttempt, generateFlashcards,
  SectionSummary as SectionSummaryData,
  QuizQuestion, PracticeScenario, PracticeGrade, Flashcard,
} from '../services/api';
import { loadLatestPlan, findFirstMatchingNode, nodeTypesForSection } from '../lib/sectionMap';

interface Section {
  id: string;
  title: string;
  content: string;
  number: string;
}

function parseSections(md: string): Section[] {
  const sections: Section[] = [];
  const parts = md.split(/(?=^## \d+\. )/m);
  for (const part of parts) {
    const match = part.match(/^## (\d+)\. (.+)$/m);
    if (match) {
      sections.push({
        id: `section-${match[1]}`,
        number: match[1],
        title: match[2].trim(),
        content: part.trim(),
      });
    }
  }
  return sections;
}

// ─── Glossary ────────────────────────────────────────────────────────────────
// Terms that trigger an AI-powered hover tooltip. Longer terms first so the
// regex prefers "Bitmap Heap Scan" over "Heap".
const GLOSSARY_TERMS = [
  'Bitmap Index Scan', 'Bitmap Heap Scan', 'Index Only Scan', 'Index Scan',
  'Sequential Scan', 'Seq Scan', 'Nested Loop', 'Hash Join', 'Merge Join',
  'Materialized View', 'Materialize', 'CTID', 'MVCC', 'TOAST', 'WAL',
  'Visibility Map', 'Free Space Map', 'Autovacuum', 'VACUUM', 'ANALYZE',
  'pg_stats', 'pg_class', 'pg_indexes', 'work_mem', 'shared_buffers',
  'B-tree', 'BRIN', 'GiST', 'GIN', 'Hash Index',
  'HOT update', 'Heap', 'Tuple', 'Fillfactor', 'Bloat',
  'Partial Index', 'Covering Index', 'Expression Index',
];

const GLOSSARY_REGEX = new RegExp(
  '\\b(' + GLOSSARY_TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'g',
);

function GlossaryTerm({ term, sectionTitle }: { term: string; sectionTitle?: string }) {
  const isVelarisUser = useContext(VelarisUserCtx);
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, string>>(
    (GlossaryTerm as any)._cache ?? ((GlossaryTerm as any)._cache = new Map()),
  );

  if (!isVelarisUser) {
    return (
      <span className="border-b border-dotted border-gray-600/50 text-gray-400 cursor-default">
        {term}
      </span>
    );
  }

  async function load() {
    const key = term.toLowerCase();
    const cached = cacheRef.current.get(key);
    if (cached) {
      setExplanation(cached);
      return;
    }
    setLoading(true);
    try {
      const text = await explainTerm(term, sectionTitle);
      cacheRef.current.set(key, text);
      setExplanation(text);
    } catch {
      setExplanation('Could not load explanation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => { setOpen(true); if (!explanation) load(); }}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="border-b border-dotted border-blue-400/60 text-blue-300 cursor-help">
        {term}
      </span>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-40 w-72 p-3 rounded-lg bg-gray-900 border border-blue-500/30 shadow-xl text-[11px] leading-relaxed text-gray-200 normal-case not-italic font-normal"
        >
          <span className="flex items-center gap-1.5 mb-1.5 text-blue-400 text-[10px] font-semibold uppercase tracking-wide">
            <Sparkles size={10} /> {term}
          </span>
          {loading && (
            <span className="flex items-center gap-2 text-gray-400">
              <Loader2 size={11} className="animate-spin" /> Loading…
            </span>
          )}
          {!loading && explanation && <span>{explanation}</span>}
        </span>
      )}
    </span>
  );
}

// Recursively walks markdown-rendered children and wraps glossary matches
// inside text nodes. Leaves non-string nodes untouched.
function decorateGlossary(children: ReactNode, sectionTitle?: string): ReactNode {
  const seen = new Set<string>(); // only decorate first occurrence per render
  function walk(node: ReactNode): ReactNode {
    if (typeof node !== 'string') return node;
    const pieces: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const re = new RegExp(GLOSSARY_REGEX.source, 'g');
    while ((match = re.exec(node)) !== null) {
      const term = match[1];
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (match.index > lastIndex) pieces.push(node.slice(lastIndex, match.index));
      pieces.push(
        <GlossaryTerm key={`${key}-${match.index}`} term={term} sectionTitle={sectionTitle} />,
      );
      lastIndex = match.index + term.length;
    }
    if (pieces.length === 0) return node;
    if (lastIndex < node.length) pieces.push(node.slice(lastIndex));
    return <>{pieces}</>;
  }
  return Children.map(children, walk);
}

// ─── TL;DR summary panel ─────────────────────────────────────────────────────
function SummaryPanel({ section }: { section: Section }) {
  const isVelarisUser = useContext(VelarisUserCtx);
  const [data, setData] = useState<SectionSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVelarisUser) return;
    let cancelled = false;
    const cacheKey = `learn-summary:${section.id}`;

    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      try {
        setData(JSON.parse(stored));
        setError(null);
        return;
      } catch { /* fall through */ }
    }

    setData(null);
    setError(null);
    setLoading(true);
    summarizeSection(section.id, section.title, section.content)
      .then(s => {
        if (cancelled) return;
        setData(s);
        try { localStorage.setItem(cacheKey, JSON.stringify(s)); } catch { /* quota */ }
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to summarize'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [section.id, section.title, section.content]);

  if (!isVelarisUser) {
    return (
      <div className="mb-6 rounded-xl border border-gray-700/40 bg-gray-900/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={13} className="text-gray-600" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">AI summary</span>
          <Lock size={11} className="text-gray-600 ml-auto" />
        </div>
        <p className="text-xs text-gray-600">
          Available to{' '}
          <span className="text-gray-500">{VELARIS_DOMAIN}</span> users.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={13} className="text-blue-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-400">
          AI summary
        </span>
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 size={12} className="animate-spin" /> Distilling the essentials…
        </div>
      )}
      {error && !loading && <div className="text-xs text-red-400">{error}</div>}
      {data && !loading && (
        <>
          <p className="text-sm text-gray-200 leading-relaxed mb-3">{data.tldr}</p>
          <ul className="space-y-1.5">
            {data.takeaways.map((t, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-400">
                <span className="text-blue-400 font-bold">•</span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Ask-this-page chat ──────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function AskPanel({ section }: { section: Section }) {
  const isVelarisUser = useContext(VelarisUserCtx);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset conversation on section change.
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [section.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function submit() {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setLoading(true);
    try {
      const answer = await askAboutSection(section.title, section.content, q);
      setMessages([...next, { role: 'assistant', content: answer }]);
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: `⚠️ ${e.message || 'Failed to answer.'}` }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isVelarisUser) return null;

  const suggestions = [
    'Explain this with a concrete example',
    'When would I use this in production?',
    'What are the common pitfalls?',
  ];

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/30 transition-colors"
        >
          <MessageCircle size={16} />
          <span className="text-sm font-semibold">Ask about this topic</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 flex-shrink-0">
            <Sparkles size={14} className="text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200">Ask about</p>
              <p className="text-[11px] text-gray-500 truncate">{section.title}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-300 p-1 rounded"
              aria-label="Close chat"
            >
              <X size={14} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !loading && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ask anything about this section. Answers are grounded in the material on this page.
                </p>
                <div className="space-y-1.5">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="w-full text-left text-[11px] px-3 py-2 rounded-lg bg-gray-800/70 hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs leading-relaxed rounded-lg px-3 py-2 ${
                  m.role === 'user'
                    ? 'bg-blue-600/20 border border-blue-500/30 text-gray-100 ml-6'
                    : 'bg-gray-800/70 border border-gray-700/60 text-gray-300 mr-6'
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    code: ({ children, className }) => {
                      const isBlock = /language-/.test(className || '') || String(children).includes('\n');
                      return isBlock ? (
                        <pre className="bg-gray-950 border border-gray-800 rounded-md px-2 py-1.5 my-1.5 overflow-x-auto text-[11px]">
                          <code>{String(children).replace(/\n$/, '')}</code>
                        </pre>
                      ) : (
                        <code className="bg-gray-950/70 px-1 py-0.5 rounded text-blue-300 text-[11px]">
                          {children}
                        </code>
                      );
                    },
                    ul: ({ children }) => <ul className="list-disc ml-4 space-y-1 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 space-y-1 mb-2">{children}</ol>,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mr-6 px-3 py-2">
                <Loader2 size={11} className="animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-800 flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                }}
                placeholder="Ask a question…"
                rows={1}
                className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 max-h-24"
              />
              <button
                onClick={submit}
                disabled={loading || !input.trim()}
                className="flex-shrink-0 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                aria-label="Send"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Quiz ────────────────────────────────────────────────────────────────────
function QuizPanel({ section }: { section: Section }) {
  const isVelarisUser = useContext(VelarisUserCtx);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState(false);

  if (!isVelarisUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={36} className="text-gray-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-500 mb-1">Velaris users only</h3>
        <p className="text-sm text-gray-600 max-w-md">
          Sign in with a <span className="text-gray-500">{VELARIS_DOMAIN}</span> account to access AI-powered quizzes.
        </p>
      </div>
    );
  }

  useEffect(() => { setQuestions(null); setAnswers({}); setRevealed(false); setError(null); }, [section.id]);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const qs = await generateQuiz(section.id, section.title, section.content);
      setQuestions(qs);
      setAnswers({});
      setRevealed(false);
    } catch (e: any) {
      setError(e.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  }

  function pick(qi: number, ci: number) {
    if (revealed) return;
    setAnswers(a => ({ ...a, [qi]: ci }));
  }

  const score = useMemo(() => {
    if (!questions) return 0;
    return questions.reduce((s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0), 0);
  }, [questions, answers]);

  if (!questions) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Brain size={36} className="text-blue-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-100 mb-1">Test yourself</h3>
        <p className="text-sm text-gray-500 mb-5 max-w-md">
          Generate a 4-question multiple-choice quiz from this section, with instant grading and explanations.
        </p>
        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Generating quiz…</> : <><Sparkles size={14} /> Generate quiz</>}
        </button>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    );
  }

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-100">Quiz · {section.title}</h3>
        </div>
        <button
          type="button"
          onClick={start}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RotateCcw size={11} /> New quiz
        </button>
      </div>

      {questions.map((q, qi) => {
        const picked = answers[qi];
        return (
          <div key={qi} className="p-4 rounded-xl border border-gray-700 bg-gray-900/60">
            <p className="text-sm text-gray-100 mb-3">
              <span className="text-blue-400 font-mono mr-2">{qi + 1}.</span>{q.question}
            </p>
            <div className="space-y-1.5">
              {q.choices.map((c, ci) => {
                const isPicked = picked === ci;
                const isCorrect = revealed && ci === q.correctIndex;
                const isWrongPick = revealed && isPicked && ci !== q.correctIndex;
                return (
                  <button
                    key={ci}
                    type="button"
                    onClick={() => pick(qi, ci)}
                    disabled={revealed}
                    className={`w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs border transition-colors ${
                      isCorrect ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                      : isWrongPick ? 'bg-red-500/15 border-red-500/50 text-red-200'
                      : isPicked ? 'bg-blue-500/15 border-blue-500/50 text-blue-200'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <span className="font-mono text-[10px] mt-0.5 opacity-60">{String.fromCharCode(65 + ci)}</span>
                    <span className="flex-1">{c}</span>
                    {isCorrect && <Check size={12} className="flex-shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <div className="mt-3 p-3 rounded-lg bg-gray-800/60 border border-gray-700/60">
                <p className="text-[11px] text-gray-400 leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}

      {!revealed ? (
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => setRevealed(true)}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {allAnswered ? 'Submit & grade' : `Answer all questions (${Object.keys(answers).length}/${questions.length})`}
        </button>
      ) : (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 text-center">
          <p className="text-2xl font-bold text-gray-100">{score} / {questions.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {score === questions.length ? '🎉 Perfect — you nailed it.' :
             score >= questions.length * 0.75 ? 'Solid grasp of this material.' :
             score >= questions.length * 0.5 ? 'Worth a re-read of this section.' :
             'Read the section once more, then retry.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Practice sandbox ────────────────────────────────────────────────────────
function SandboxPanel({ section }: { section: Section }) {
  const isVelarisUser = useContext(VelarisUserCtx);
  const [scenario, setScenario] = useState<PracticeScenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState('');
  const [grade, setGrade] = useState<PracticeGrade | null>(null);
  const [grading, setGrading] = useState(false);
  const [showHints, setShowHints] = useState(false);

  if (!isVelarisUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={36} className="text-gray-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-500 mb-1">Velaris users only</h3>
        <p className="text-sm text-gray-600 max-w-md">
          Sign in with a <span className="text-gray-500">{VELARIS_DOMAIN}</span> account to access the AI practice sandbox.
        </p>
      </div>
    );
  }

  useEffect(() => { setScenario(null); setAttempt(''); setGrade(null); setError(null); setShowHints(false); }, [section.id]);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const s = await generateScenario(section.id, section.title, section.content);
      setScenario(s);
      setAttempt('');
      setGrade(null);
    } catch (e: any) {
      setError(e.message || 'Failed to generate scenario');
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!scenario || !attempt.trim() || grading) return;
    setGrading(true);
    setError(null);
    try {
      const g = await gradeSqlAttempt(scenario, attempt);
      setGrade(g);
    } catch (e: any) {
      setError(e.message || 'Failed to grade attempt');
    } finally {
      setGrading(false);
    }
  }

  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FlaskConical size={36} className="text-blue-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-100 mb-1">Practice sandbox</h3>
        <p className="text-sm text-gray-500 mb-5 max-w-md">
          Get a realistic scenario, write your SQL, and have an AI grader compare it to the optimal solution.
        </p>
        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Building scenario…</> : <><Sparkles size={14} /> Generate scenario</>}
        </button>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    );
  }

  const verdictColor =
    grade?.verdict === 'correct' ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-200' :
    grade?.verdict === 'partial' ? 'border-amber-500/40 bg-amber-500/5 text-amber-200' :
    'border-red-500/40 bg-red-500/5 text-red-200';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-100">Practice · {section.title}</h3>
        </div>
        <button type="button" onClick={start} className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors">
          <RotateCcw size={11} /> New scenario
        </button>
      </div>

      <div className="p-4 rounded-xl border border-gray-700 bg-gray-900/60 space-y-3">
        <p className="text-sm text-gray-200 leading-relaxed">{scenario.scenario}</p>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">Schema</p>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language="sql"
            customStyle={{ borderRadius: '0.5rem', fontSize: '0.7rem', margin: 0, border: '1px solid rgb(31 41 55)' }}
          >
            {scenario.schema}
          </SyntaxHighlighter>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <p className="text-[10px] uppercase tracking-wide text-blue-400 font-semibold mb-1">Your task</p>
          <p className="text-sm text-gray-200">{scenario.task}</p>
        </div>
        {scenario.hints?.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowHints(s => !s)}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200"
            >
              {showHints ? <EyeOff size={11} /> : <Eye size={11} />}
              {showHints ? 'Hide hints' : `Show hints (${scenario.hints.length})`}
            </button>
            {showHints && (
              <ul className="mt-2 space-y-1">
                {scenario.hints.map((h, i) => (
                  <li key={i} className="text-[11px] text-gray-400 flex gap-2">
                    <span className="text-blue-400">•</span><span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold block mb-1.5">
          Your SQL
        </label>
        <textarea
          value={attempt}
          onChange={e => setAttempt(e.target.value)}
          rows={8}
          placeholder="-- write your CREATE INDEX, query rewrite, or SQL solution here"
          className="w-full font-mono text-xs bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-y"
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={grading || !attempt.trim()}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {grading ? <><Loader2 size={14} className="animate-spin" /> Grading…</> : <>Grade my answer</>}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {grade && (
        <div className={`p-4 rounded-xl border ${verdictColor}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide">{grade.verdict}</span>
            <span className="text-2xl font-bold tabular-nums">{grade.score}/10</span>
          </div>
          <p className="text-xs leading-relaxed mb-3 text-gray-200">{grade.feedback}</p>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">Optimal solution</p>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children }) {
                  const match = /language-(\w+)/.exec(className ?? '');
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        customStyle={{ borderRadius: '0.5rem', fontSize: '0.7rem', margin: 0, border: '1px solid rgb(31 41 55)' }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  }
                  return <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{children}</code>;
                },
                p: ({ children }) => <p className="text-xs text-gray-300 mb-2">{children}</p>,
              }}
            >
              {grade.optimalSolution}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Flashcards (with localStorage SM-2-lite spaced repetition) ──────────────
interface CardState {
  ease: number;       // 1=hard, 2=ok, 3=easy
  reviewedAt: number; // ms epoch
  due: number;        // ms epoch
}
type DeckState = Record<number, CardState>;

const DAY_MS = 24 * 60 * 60 * 1000;

function intervalFor(ease: number, prev?: CardState): number {
  // Lightweight SM-2-style: hard=10min, ok=1d→3d→7d, easy=3d→7d→21d
  if (ease === 1) return 10 * 60 * 1000;
  const last = prev ? (prev.due - prev.reviewedAt) : 0;
  const lastDays = last / DAY_MS;
  if (ease === 2) {
    if (lastDays < 1) return 1 * DAY_MS;
    if (lastDays < 3) return 3 * DAY_MS;
    return 7 * DAY_MS;
  }
  if (lastDays < 3) return 3 * DAY_MS;
  if (lastDays < 7) return 7 * DAY_MS;
  return 21 * DAY_MS;
}

function FlashcardsPanel({ section }: { section: Section }) {
  const isVelarisUser = useContext(VelarisUserCtx);
  const stateKey = `learn-flashcards-state:${section.id}`;
  const cardsKey = `learn-flashcards:${section.id}`;

  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [state, setState] = useState<DeckState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!isVelarisUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={36} className="text-gray-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-500 mb-1">Velaris users only</h3>
        <p className="text-sm text-gray-600 max-w-md">
          Sign in with a <span className="text-gray-500">{VELARIS_DOMAIN}</span> account to access AI-generated flashcards.
        </p>
      </div>
    );
  }

  // Load from localStorage on mount / section change.
  useEffect(() => {
    setIdx(0); setFlipped(false); setError(null);
    try {
      const cached = localStorage.getItem(cardsKey);
      if (cached) setCards(JSON.parse(cached));
      else setCards(null);
      const s = localStorage.getItem(stateKey);
      setState(s ? JSON.parse(s) : {});
    } catch {
      setCards(null);
      setState({});
    }
  }, [section.id, cardsKey, stateKey]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const c = await generateFlashcards(section.id, section.title, section.content);
      setCards(c);
      try { localStorage.setItem(cardsKey, JSON.stringify(c)); } catch {}
      setIdx(0); setFlipped(false);
    } catch (e: any) {
      setError(e.message || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  }

  function rate(ease: number) {
    if (!cards) return;
    const now = Date.now();
    const prev = state[idx];
    const next: CardState = { ease, reviewedAt: now, due: now + intervalFor(ease, prev) };
    const newState = { ...state, [idx]: next };
    setState(newState);
    try { localStorage.setItem(stateKey, JSON.stringify(newState)); } catch {}
    // advance to next due card.
    const total = cards.length;
    let candidate = (idx + 1) % total;
    for (let i = 0; i < total; i++) {
      const cs = newState[candidate];
      if (!cs || cs.due <= Date.now()) break;
      candidate = (candidate + 1) % total;
    }
    setIdx(candidate);
    setFlipped(false);
  }

  if (!cards) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Layers size={36} className="text-blue-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-100 mb-1">Flashcards</h3>
        <p className="text-sm text-gray-500 mb-5 max-w-md">
          Generate spaced-repetition cards. Your progress is saved locally.
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Building deck…</> : <><Sparkles size={14} /> Generate flashcards</>}
        </button>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    );
  }

  const card = cards[idx];
  const dueCount = cards.filter((_, i) => {
    const s = state[i];
    return !s || s.due <= Date.now();
  }).length;

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-100">Card {idx + 1} of {cards.length}</h3>
          <span className="text-[11px] text-gray-500">· {dueCount} due now</span>
        </div>
        <button
          type="button"
          onClick={() => { localStorage.removeItem(cardsKey); localStorage.removeItem(stateKey); setCards(null); setState({}); }}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RotateCcw size={11} /> Reset deck
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFlipped(f => !f)}
        className="w-full min-h-[220px] p-6 rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-800 transition-all flex items-center justify-center text-center cursor-pointer"
      >
        <div>
          <p className="text-[10px] uppercase tracking-wide text-blue-400 font-semibold mb-3">
            {flipped ? 'Answer' : 'Question'}
          </p>
          <p className="text-base text-gray-100 leading-relaxed whitespace-pre-wrap">
            {flipped ? card.back : card.front}
          </p>
          {!flipped && (
            <p className="text-[11px] text-gray-600 mt-4">click to reveal</p>
          )}
        </div>
      </button>

      {flipped && (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => rate(1)} className="py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-200 text-xs font-medium transition-colors">
            Hard · 10 min
          </button>
          <button type="button" onClick={() => rate(2)} className="py-2.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-200 text-xs font-medium transition-colors">
            Good · 1–7 d
          </button>
          <button type="button" onClick={() => rate(3)} className="py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 text-xs font-medium transition-colors">
            Easy · 3–21 d
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Worked example from your last analyzed plan ─────────────────────────────
function WorkedExamplePanel({ section }: { section: Section }) {
  const sectionNumber = parseInt(section.number, 10);
  const nodeTypes = useMemo(() => nodeTypesForSection(sectionNumber), [sectionNumber]);
  const stored = useMemo(() => loadLatestPlan(), [section.id]);
  const matchedNode = useMemo(
    () => (stored && nodeTypes.length > 0 ? findFirstMatchingNode(stored.plan, nodeTypes) : null),
    [stored, nodeTypes],
  );
  const [open, setOpen] = useState(false);

  if (!matchedNode || !stored) return null;

  const time = (matchedNode['Actual Total Time'] ?? 0) as number;
  const rows = (matchedNode['Actual Rows'] ?? 0) as number;
  const planRows = (matchedNode['Plan Rows'] ?? 0) as number;
  const relation = matchedNode['Relation Name'] as string | undefined;

  return (
    <div className="mb-6 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical size={13} className="text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
          Worked example from your last analyzed query
        </span>
      </div>
      <p className="text-sm text-gray-200">
        Your plan from {new Date(stored.savedAt).toLocaleString()} contains a{' '}
        <span className="font-mono text-emerald-300">{matchedNode['Node Type']}</span>
        {relation && <> on <span className="font-mono text-emerald-300">{relation}</span></>}
        {' '}— this section explains exactly that.
      </p>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mt-2 text-[11px] text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
      >
        {open ? 'Hide details' : 'Show details'}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-gray-900/60 border border-gray-700/60">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Actual time</p>
            <p className="text-sm font-bold text-gray-100 tabular-nums">{time.toFixed(2)} ms</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-900/60 border border-gray-700/60">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Actual rows</p>
            <p className="text-sm font-bold text-gray-100 tabular-nums">{rows.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-900/60 border border-gray-700/60">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Estimated</p>
            <p className="text-sm font-bold text-gray-100 tabular-nums">{planRows.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
type LearnTab = 'read' | 'quiz' | 'sandbox' | 'flashcards';

export default function Learn() {
  const { user, isLoaded } = useUser();
  const isVelarisUser =
    isLoaded &&
    (user?.primaryEmailAddress?.emailAddress?.toLowerCase().endsWith(VELARIS_DOMAIN) ?? false);

  const sections = useMemo(() => parseSections(content), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const initialId = requestedSection
    ? sections.find(s => s.number === requestedSection)?.id ?? sections[0]?.id ?? ''
    : sections[0]?.id ?? '';

  const [activeId, setActiveId] = useState<string>(initialId);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<LearnTab>('read');

  // Respond to URL changes (e.g. user clicks a "Learn why" deep link).
  useEffect(() => {
    if (!requestedSection) return;
    const target = sections.find(s => s.number === requestedSection);
    if (target && target.id !== activeId) {
      setActiveId(target.id);
      setTab('read');
    }
  }, [requestedSection, sections, activeId]);

  function selectSection(id: string) {
    setActiveId(id);
    setTab('read');
    const num = sections.find(s => s.id === id)?.number;
    if (num) setSearchParams({ section: num }, { replace: true });
  }

  const filtered = useMemo(
    () => sections.filter(s => s.title.toLowerCase().includes(search.toLowerCase())),
    [sections, search],
  );

  const current = sections.find(s => s.id === activeId);

  return (
    <VelarisUserCtx.Provider value={isVelarisUser}>
    <div className="flex h-[calc(100vh-56px)]">
      {/* ── Sidebar ── */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={15} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-200">PostgreSQL Guide</span>
            <span className="ml-auto text-xs text-gray-600 tabular-nums">{sections.length} topics</span>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search topics…"
              className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-1.5">
          {filtered.map(section => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => selectSection(section.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border-r-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border-r-2 border-transparent'
                }`}
              >
                <span className="text-[10px] font-black font-mono text-gray-600 w-5 flex-shrink-0 tabular-nums">
                  {section.number.padStart(2, '0')}
                </span>
                <span className="text-xs leading-snug flex-1">{section.title}</span>
                {isActive && <ChevronRight size={11} className="flex-shrink-0" />}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="px-4 py-8 text-xs text-gray-600 text-center">No matching topics.</p>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0 bg-gray-900/60">
          <p className="text-[10px] text-gray-500 leading-relaxed mt-1.5">
            Content based on{' '}
            <a
              href="https://masteringpostgres.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400/80 hover:text-blue-400 underline underline-offset-2"
            >
              Mastering Postgres
            </a>
            {' '}— widely regarded as one of the best PostgreSQL courses.{' '}
            <a
              href="https://twitter.com/aarondfrancis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400/80 hover:text-blue-400 underline underline-offset-2"
            >
              Follow Aaron
            </a>{' '}for more.
          </p>
        </div>
      </aside>

      {/* ── Content area ── */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        {current ? (
          <div className="max-w-3xl mx-auto px-8 py-10">
            <TabBar tab={tab} onChange={setTab} />

            {tab === 'quiz' && <QuizPanel section={current} />}
            {tab === 'sandbox' && <SandboxPanel section={current} />}
            {tab === 'flashcards' && <FlashcardsPanel section={current} />}

            {tab === 'read' && <>
            <WorkedExamplePanel section={current} />
            <SummaryPanel section={current} />

            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }) { return <>{children}</>; },
                code({ className, children }) {
                  const match = /language-(\w+)/.exec(className ?? '');
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          margin: '0.75rem 0',
                          border: '1px solid rgb(31 41 55)',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  }
                  const raw = String(children);
                  if (raw.includes('\n')) {
                    return (
                      <pre className="learn-plain-code">
                        <code>{raw.replace(/\n$/, '')}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-[0.72rem] font-mono">
                      {children}
                    </code>
                  );
                },

                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4 rounded-lg border border-gray-800">
                      <table className="w-full text-xs">{children}</table>
                    </div>
                  );
                },
                thead({ children }) {
                  return <thead className="bg-gray-800/70">{children}</thead>;
                },
                th({ children }) {
                  return (
                    <th className="px-4 py-2.5 text-left text-gray-300 font-semibold border-b border-gray-700 whitespace-nowrap">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-4 py-2.5 border-b border-gray-800/50 text-gray-400 text-xs">
                      {decorateGlossary(children, current.title)}
                    </td>
                  );
                },

                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-2 border-blue-500/40 pl-4 my-4 bg-blue-500/5 py-2 pr-4 rounded-r-lg text-gray-400 italic text-sm">
                      {children}
                    </blockquote>
                  );
                },

                h2({ children }) {
                  return (
                    <h2 className="text-xl font-bold text-white mt-0 mb-5 pb-3 border-b border-gray-800">
                      {children}
                    </h2>
                  );
                },
                h3({ children }) {
                  return (
                    <h3 className="text-base font-semibold text-gray-200 mt-7 mb-3">{children}</h3>
                  );
                },
                h4({ children }) {
                  return (
                    <h4 className="text-sm font-semibold text-gray-300 mt-5 mb-2">{children}</h4>
                  );
                },

                p({ children }) {
                  return (
                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                      {decorateGlossary(children, current.title)}
                    </p>
                  );
                },
                ul({ children }) {
                  return (
                    <ul className="list-disc list-outside ml-5 text-gray-400 text-sm space-y-1 mb-3">
                      {children}
                    </ul>
                  );
                },
                ol({ children }) {
                  return (
                    <ol className="list-decimal list-outside ml-5 text-gray-400 text-sm space-y-1 mb-3">
                      {children}
                    </ol>
                  );
                },
                li({ children }) {
                  return <li>{decorateGlossary(children, current.title)}</li>;
                },
                strong({ children }) {
                  return <strong className="font-semibold text-gray-200">{children}</strong>;
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      {children}
                    </a>
                  );
                },
                hr() {
                  return <hr className="border-gray-800 my-6" />;
                },
              }}
            >
              {current.content}
            </ReactMarkdown>

            <div className="flex gap-3 mt-10 pt-6 border-t border-gray-800">
              {(() => {
                const idx = sections.findIndex(s => s.id === activeId);
                const prev = sections[idx - 1];
                const next = sections[idx + 1];
                return (
                  <>
                    {prev ? (
                      <button
                        onClick={() => selectSection(prev.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        ← {prev.number}. {prev.title}
                      </button>
                    ) : (
                      <div />
                    )}
                    {next && (
                      <button
                        onClick={() => selectSection(next.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs text-gray-400 hover:text-gray-200 transition-colors ml-auto"
                      >
                        {next.number}. {next.title} →
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
            </>}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Select a topic from the sidebar.
          </div>
        )}

        {current && tab === 'read' && <AskPanel section={current} />}
      </main>
    </div>
    </VelarisUserCtx.Provider>
  );
}

function TabBar({ tab, onChange }: { tab: LearnTab; onChange: (t: LearnTab) => void }) {
  const tabs: { id: LearnTab; label: string; icon: ReactNode }[] = [
    { id: 'read', label: 'Read', icon: <BookOpen size={12} /> },
    { id: 'quiz', label: 'Quiz', icon: <Brain size={12} /> },
    { id: 'sandbox', label: 'Sandbox', icon: <FlaskConical size={12} /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers size={12} /> },
  ];
  return (
    <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-gray-900/60 border border-gray-800 w-fit">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === t.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
