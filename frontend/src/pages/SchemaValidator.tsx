import { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Zap,
  BookOpen,
  ExternalLink,
  Wand2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Database,
  Loader2,
} from 'lucide-react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  validateSchema,
  generateOptimalQueries,
  getHistoryRecord,
  type SchemaValidationRecord,
  type QueryGenerationRecord,
  SchemaValidationResult,
  SchemaFinding,
  SchemaRecommendation,
  SuggestedReading,
  OptimizedQuery,
  QueryIndex,
  QueryGenerationResult,
} from '../services/api';
import { useAnalysisStore } from '../store/analysisStore';

// ─── Severity / priority config (same tokens as LLMAnalysis) ─────────────────

const severityConfig = {
  critical: {
    icon: AlertCircle,
    iconColor: 'text-red-400',
    border: 'border-red-500',
    bg: 'bg-red-500/10',
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    border: 'border-amber-500',
    bg: 'bg-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    label: 'Warning',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    label: 'Info',
  },
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/10',
    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    label: 'Good',
  },
} as const;

const priorityConfig = {
  high: { badge: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  medium: { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  low: { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
} as const;

const scoreBarClass: Record<number, string> = {
  1: 'w-[10%]', 2: 'w-[20%]', 3: 'w-[30%]', 4: 'w-[40%]',
  5: 'w-[50%]', 6: 'w-[60%]', 7: 'w-[70%]', 8: 'w-[80%]',
  9: 'w-[90%]', 10: 'w-full',
};

function scoreColor(score: number) {
  if (score >= 9) return 'text-emerald-400';
  if (score >= 7) return 'text-blue-400';
  if (score >= 5) return 'text-amber-400';
  if (score >= 3) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBgColor(score: number) {
  if (score >= 9) return 'bg-emerald-500';
  if (score >= 7) return 'bg-blue-500';
  if (score >= 5) return 'bg-amber-500';
  if (score >= 3) return 'bg-orange-500';
  return 'bg-red-500';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">{children}</span>
      <div className="flex-1 h-px bg-gray-700" />
    </div>
  );
}

// ─── Finding card ─────────────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: SchemaFinding }) {
  const cfg = severityConfig[finding.severity];
  const Icon = cfg.icon;

  return (
    <div className={`flex gap-3 p-4 rounded-lg border-l-4 ${cfg.border} ${cfg.bg}`}>
      <Icon size={18} className={`${cfg.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-gray-100 font-semibold text-sm leading-snug">{finding.title}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">{finding.description}</p>
        {finding.knowledgeRef && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded px-2 py-0.5">
            <BookOpen size={10} />
            {finding.knowledgeRef}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Recommendation card (no SQL — full fix lives in correctedSchema) ─────────

function RecommendationCard({ rec, index }: { rec: SchemaRecommendation; index: number }) {
  const cfg = priorityConfig[rec.priority];

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-gray-300 text-xs font-bold">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-gray-100 font-semibold text-sm">{rec.title}</span>
            <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {rec.priority}
            </span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{rec.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Corrected schema panel ───────────────────────────────────────────────────

function CorrectedSchemaPanel({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/10">
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">Corrected Schema</span>
          <span className="text-xs text-emerald-400/60">— all issues applied</span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-300 hover:text-emerald-100 border border-emerald-500/30 transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>
      <SyntaxHighlighter
        language="sql"
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '1.25rem 1.5rem', fontSize: '0.8rem', background: '#0a1a12' }}
      >
        {sql}
      </SyntaxHighlighter>
    </div>
  );
}

// ─── Suggested readings panel ─────────────────────────────────────────────────

function SuggestedReadingsPanel({ readings }: { readings: SuggestedReading[] }) {
  return (
    <div className="space-y-3">
      {readings.map((r) => (
        <Link
          key={r.number}
          to={`/learn#section-${r.number}`}
          className="flex items-start gap-3 p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:border-purple-500/40 hover:bg-purple-500/5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-purple-400 text-xs font-bold">{r.sectionRef}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-gray-100 text-sm font-semibold group-hover:text-purple-300 transition-colors">
                {r.title}
              </span>
              <ExternalLink size={11} className="text-gray-500 group-hover:text-purple-400 flex-shrink-0 transition-colors" />
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">{r.reason}</p>
          </div>
          <BookOpen size={14} className="text-gray-600 group-hover:text-purple-400 flex-shrink-0 mt-0.5 transition-colors" />
        </Link>
      ))}
    </div>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────

function ResultPanel({ result, cached }: { result: SchemaValidationResult; cached: boolean }) {
  const score = Math.max(1, Math.min(10, result.overallScore));

  return (
    <div className="space-y-8 mt-8">
      {/* Score + summary */}
      <div className="flex gap-6 items-start p-5 rounded-xl bg-gray-800/60 border border-gray-700">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className={`text-5xl font-black leading-none ${scoreColor(score)}`}>{score}</div>
          <div className="text-gray-500 text-xs font-semibold mt-1">/ 10</div>
          <div className={`mt-2 text-xs font-bold uppercase tracking-wide ${scoreColor(score)}`}>
            {result.scoreLabel}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Design score</span>
            <div className="flex items-center gap-2">
              {cached && (
                <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  cached
                </span>
              )}
              <span>{score}/10</span>
            </div>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all ${scoreBgColor(score)} ${scoreBarClass[score]}`} />
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{result.designSummary}</p>
        </div>
      </div>

      {/* Findings */}
      {result.findings.length > 0 && (
        <div>
          <SectionHeader>Findings</SectionHeader>
          <div className="space-y-3">
            {result.findings.map((f, i) => <FindingCard key={i} finding={f} />)}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div>
          <SectionHeader>Recommendations</SectionHeader>
          <div className="space-y-4">
            {result.recommendations.map((r, i) => (
              <RecommendationCard key={i} rec={r} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Corrected schema */}
      {result.correctedSchema && (
        <div>
          <SectionHeader>Corrected Schema</SectionHeader>
          <CorrectedSchemaPanel sql={result.correctedSchema} />
        </div>
      )}

      {/* Suggested readings */}
      {result.suggestedReadings?.length > 0 && (
        <div>
          <SectionHeader>Suggested Reading</SectionHeader>
          <SuggestedReadingsPanel readings={result.suggestedReadings} />
        </div>
      )}

      {/* Bottom line */}
      {result.summary && (
        <div className="flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <Zap size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              Bottom Line
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Query generation ───────────────────────────────────────────────────────────────

const impactConfig = {
  critical:    { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',    label: 'Critical' },
  recommended: { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', label: 'Recommended' },
  optional:    { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',   label: 'Optional' },
} as const;

function QueryCard({ query, index }: { query: OptimizedQuery; index: number }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(query.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-800/60">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-400 text-xs font-bold">{index + 1}</span>
        </div>
        <p className="flex-1 text-gray-200 text-sm font-medium leading-snug">{query.description}</p>
        <button onClick={handleCopy} type="button" className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-colors flex-shrink-0">
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter language="sql" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem 1.25rem', fontSize: '0.775rem', background: 'transparent' }}>
        {query.sql}
      </SyntaxHighlighter>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 border-t border-gray-700/50 transition-colors">
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {open ? 'Hide explanation' : 'Why is this optimal?'}
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-800/30">
          <p className="text-gray-400 text-sm leading-relaxed">{query.explanation}</p>
        </div>
      )}
    </div>
  );
}

function IndexCard({ idx }: { idx: QueryIndex }) {
  const [copied, setCopied] = useState(false);
  const cfg = impactConfig[idx.impact];
  const handleCopy = async () => {
    await navigator.clipboard.writeText(idx.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 bg-gray-800/60">
        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
        <button onClick={handleCopy} type="button" className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-colors">
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter language="sql" style={vscDarkPlus} customStyle={{ margin: 0, padding: '0.875rem 1.25rem', fontSize: '0.775rem', background: 'transparent' }}>
        {idx.sql}
      </SyntaxHighlighter>
      <div className="px-4 py-2.5 border-t border-gray-700/50 bg-gray-800/30">
        <p className="text-gray-400 text-xs leading-relaxed">{idx.reason}</p>
      </div>
    </div>
  );
}

function IndexesSection({ indexes }: { indexes: QueryIndex[] }) {
  const [allCopied, setAllCopied] = useState(false);
  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(indexes.map((ix) => ix.sql).join('\n\n'));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Required Indexes</span>
        <div className="flex-1 h-px bg-gray-700" />
        <button type="button" onClick={handleCopyAll} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors">
          {allCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {allCopied ? 'Copied' : 'Copy all'}
        </button>
      </div>
      <div className="space-y-3">
        {indexes.map((ix, i) => <IndexCard key={i} idx={ix} />)}
      </div>
    </div>
  );
}

const PATTERNS_PLACEHOLDER = `Describe the queries you'll run against this schema, e.g.:
• Find all orders for a specific user, ordered by created_at DESC
• Count active orders grouped by status for a dashboard
• Look up a user by email address
• Join orders with users to show order totals per customer`;

function QueryGenSection() {
  const { schemaValidation, queryGen, setQueryGen } = useAnalysisStore();
  const [accessPatterns, setAccessPatterns] = useState(() => queryGen.accessPatterns);
  const [relatedDdl, setRelatedDdl] = useState(() => queryGen.relatedDdl);
  const [relatedOpen, setRelatedOpen] = useState(() => queryGen.relatedDdl.length > 0);
  const [result, setResult] = useState<QueryGenerationResult | null>(() => queryGen.result);
  const [cached, setCached] = useState(() => queryGen.cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = accessPatterns.trim().length > 0 && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await generateOptimalQueries(
        schemaValidation.sql.trim(),
        accessPatterns.trim(),
        relatedDdl.trim() || undefined,
      );
      setResult(data.result);
      setCached(data.cached);
      setQueryGen({ accessPatterns: accessPatterns.trim(), relatedDdl: relatedDdl.trim(), result: data.result, cached: data.cached });
    } catch (err: any) {
      setError(err.message || 'Failed to generate queries');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10">
      {/* Section divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-700" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <Sparkles size={13} className="text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300 whitespace-nowrap">Generate Optimal Queries</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-700" />
      </div>

      {/* Input card */}
      <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-700 bg-gray-800/60">
          <p className="text-gray-300 text-sm leading-relaxed">
            Describe your access patterns and get AI-generated queries with the exact indexes needed, tuned to this schema.
          </p>
        </div>

        {/* Access patterns */}
        <div className="p-5 pb-0">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Access patterns <span className="text-red-400">*</span>
          </label>
          <textarea
            value={accessPatterns}
            onChange={(e) => setAccessPatterns(e.target.value)}
            placeholder={PATTERNS_PLACEHOLDER}
            rows={6}
            spellCheck
            className="w-full bg-gray-800 rounded-lg border border-gray-700 px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
          />
        </div>

        {/* Related DDLs */}
        <div className="mt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={() => setRelatedOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database size={13} className={relatedDdl.trim() ? 'text-indigo-400' : 'text-gray-500'} />
              <span className={`text-xs font-medium ${relatedDdl.trim() ? 'text-indigo-300' : 'text-gray-500'}`}>
                Related table DDLs
                <span className="ml-1.5 font-normal text-gray-600">— optional, needed for JOIN queries</span>
              </span>
              {relatedDdl.trim() && (
                <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">set</span>
              )}
            </div>
            {relatedOpen
              ? <ChevronUp size={13} className="text-gray-500 flex-shrink-0" />
              : <ChevronDown size={13} className="text-gray-500 flex-shrink-0" />}
          </button>
          {relatedOpen && (
            <div className="border-t border-gray-700">
              <textarea
                value={relatedDdl}
                onChange={(e) => setRelatedDdl(e.target.value)}
                placeholder={`-- Paste DDL for any tables this schema JOINs with\nCREATE TABLE public.users (\n  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  email   TEXT NOT NULL UNIQUE\n);`}
                rows={8}
                spellCheck={false}
                className="w-full bg-transparent resize-none px-5 py-4 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-700 bg-gray-800/40">
          {result && !loading && (
            <span className="text-xs text-gray-500 flex items-center gap-2">
              {cached && (
                <span className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">cached</span>
              )}
              {result.queries.length} quer{result.queries.length === 1 ? 'y' : 'ies'}
              {' · '}
              {result.indexes.length} index{result.indexes.length !== 1 ? 'es' : ''}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            type="button"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              !canGenerate
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {loading
              ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
              : <><Sparkles size={13} /> {result ? 'Regenerate' : 'Generate Queries'}</>
            }
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-indigo-300 text-sm">Generating optimal queries and indexes…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Generation failed</p>
            <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-8">
          {result.queries.length > 0 && (
            <div>
              <SectionHeader>Optimized Queries</SectionHeader>
              <div className="space-y-4">
                {result.queries.map((q, i) => <QueryCard key={i} query={q} index={i} />)}
              </div>
            </div>
          )}
          {result.indexes.length > 0 && <IndexesSection indexes={result.indexes} />}
          {result.notes && (
            <div className="flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Notes</div>
                <p className="text-gray-300 text-sm leading-relaxed">{result.notes}</p>
              </div>
            </div>
          )}
          {result.suggestedReadings?.length > 0 && (
            <div>
              <SectionHeader>
                <BookOpen size={15} className="inline-block mr-1.5 -mt-0.5" />
                Recommended Reading
              </SectionHeader>
              <SuggestedReadingsPanel readings={result.suggestedReadings} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ─── Main page ────────────────────────────────────────────────────────────────

const PLACEHOLDER = `-- Paste your PostgreSQL DDL here — tables, indexes, constraints, ALTERs, triggers.
-- Example:
CREATE TABLE public.orders (
  order_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT      NOT NULL REFERENCES public.users(user_id),
  total       NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON public.orders (user_id);`;

export default function SchemaValidator() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { schemaValidation, setSchemaValidation, clearSchemaValidation, setQueryGen } = useAnalysisStore();
  const { sql, userContext, result, cached, error, loading } = schemaValidation;

  const [contextOpen, setContextOpen] = useState(() => schemaValidation.userContext.length > 0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    const isQueryGen = location.pathname.startsWith('/querygen');
    setSchemaValidation({ loading: true, error: null });
    if (isQueryGen) {
      getHistoryRecord<QueryGenerationRecord>('query_generation', id)
        .then((r) => {
          setSchemaValidation({ sql: r.primaryDdl, userContext: '', result: null, cached: false, error: null, loading: false });
          setQueryGen({ accessPatterns: r.accessPatterns, relatedDdl: r.relatedDdl ?? '', result: r.result, cached: false });
        })
        .catch((err) => setSchemaValidation({ error: err.message || 'Failed to load record', loading: false }));
    } else {
      getHistoryRecord<SchemaValidationRecord>('schema_validation', id)
        .then((r) => {
          setSchemaValidation({ sql: r.sql, userContext: r.userContext ?? '', result: r.result, cached: false, error: null, loading: false });
        })
        .catch((err) => setSchemaValidation({ error: err.message || 'Failed to load record', loading: false }));
    }
  }, [id]);

  const handleValidate = async () => {
    const trimmed = sql.trim();
    if (!trimmed) return;

    setSchemaValidation({ loading: true, error: null, result: null, cached: false });

    try {
      const data = await validateSchema(trimmed, userContext.trim() || undefined);
      setSchemaValidation({ result: data.result, cached: data.cached, loading: false });
    } catch (err: any) {
      setSchemaValidation({ error: err.message || 'Failed to validate schema', loading: false });
    }
  };

  const handleClear = () => {
    clearSchemaValidation();
    setContextOpen(false);
    textareaRef.current?.focus();
  };

  const isEmpty = sql.trim().length === 0;

  return (
    <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {id && loading && !result && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 size={28} className="text-blue-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading record…</p>
        </div>
      )}
      {id && loading && !result ? null : (
      <>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Schema Validator</h1>
        <p className="text-gray-500 text-sm">
          Paste your PostgreSQL DDL ({' '}
          <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono text-xs">
            CREATE TABLE
          </code>
          ,{' '}
          <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono text-xs">
            ALTER TABLE
          </code>
          , etc.) to get AI-powered design feedback against PostgreSQL best practices.
        </p>
      </div>

      {/* Info tip */}
      {!result && (
        <div className="mb-6 flex gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <ShieldCheck size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-purple-300 text-sm font-medium mb-1">What gets checked</p>
            <ul className="text-purple-400/80 text-xs space-y-0.5 list-disc list-inside">
              <li>Primary key types — <code className="font-mono">BIGINT GENERATED ALWAYS AS IDENTITY</code> vs legacy <code className="font-mono">SERIAL</code> / <code className="font-mono">INTEGER</code></li>
              <li>String types — <code className="font-mono">TEXT</code> preferred over <code className="font-mono">VARCHAR(n)</code></li>
              <li>Boolean flags — <code className="font-mono">BOOLEAN</code> vs <code className="font-mono">SMALLINT</code> anti-pattern</li>
              <li>Timestamp types, named constraints, FK indexes, ENUM vs CHECK</li>
            </ul>
          </div>
        </div>
      )}

      {/* SQL input */}
      <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 bg-gray-800/60">
          <span className="text-xs font-mono text-gray-400">PostgreSQL DDL</span>
          <div className="flex items-center gap-2">
            {sql && (
              <button
                onClick={handleClear}
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
            <button
              onClick={handleValidate}
              disabled={isEmpty || loading}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isEmpty || loading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              <ShieldCheck size={13} />
              {loading ? 'Validating…' : 'Validate Schema'}
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => setSchemaValidation({ sql: e.target.value })}
          placeholder={PLACEHOLDER}
          rows={16}
          spellCheck={false}
          className="w-full bg-transparent resize-none px-5 py-4 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none leading-relaxed"
        />
      </div>

      {/* Optional context panel */}
      <div className="mt-3 rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setContextOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={13} className={contextOpen || userContext ? 'text-amber-400' : 'text-gray-500'} />
            <span className={`text-xs font-medium ${contextOpen || userContext ? 'text-amber-300' : 'text-gray-500'}`}>
              Developer context
              <span className="ml-1.5 font-normal text-gray-600">— optional, helps the AI make better judgements</span>
            </span>
            {userContext.trim() && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                set
              </span>
            )}
          </div>
          {contextOpen
            ? <ChevronUp size={13} className="text-gray-500 flex-shrink-0" />
            : <ChevronDown size={13} className="text-gray-500 flex-shrink-0" />}
        </button>

        {contextOpen && (
          <div className="border-t border-gray-700">
            <textarea
              value={userContext}
              onChange={(e) => setSchemaValidation({ userContext: e.target.value })}
              placeholder={`e.g. "task_status_config is a lookup table with at most ~30 rows. task_v2 is a high-volume transactional table with ~800M rows. We use INTEGER PKs on all lookup tables for storage reasons."`}
              rows={4}
              maxLength={2000}
              spellCheck
              className="w-full bg-transparent resize-none px-5 py-4 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none leading-relaxed"
            />
            <div className="flex justify-end px-4 py-1.5 border-t border-gray-800">
              <span className={`text-xs ${
                userContext.length > 1800 ? 'text-amber-400' : 'text-gray-600'
              }`}>
                {userContext.length} / 2000
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-purple-300 text-sm">Analysing schema against PostgreSQL best practices…</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-4 flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Validation failed</p>
            <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && <ResultPanel result={result} cached={cached} />}
      {result && <QueryGenSection />}
      </>
      )}
    </div>
  );
}
