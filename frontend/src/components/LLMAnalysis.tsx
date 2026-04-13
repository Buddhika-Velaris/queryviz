import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  Trophy,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ─── Types (mirror backend) ───────────────────────────────────────────────────

interface Finding {
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  sql?: string;
}

interface SingleAnalysis {
  efficiencyScore: number;
  scoreLabel: string;
  executionSummary: string;
  findings: Finding[];
  recommendations: Recommendation[];
  summary: string;
}

interface KeyDifference {
  aspect: string;
  planA: string;
  planB: string;
  winner: 'A' | 'B' | 'tie';
}

interface ComparisonAnalysis {
  winner: 'A' | 'B' | 'tie';
  winnerMargin: 'significant' | 'marginal' | 'equal';
  winnerSummary: string;
  keyDifferences: KeyDifference[];
  findings: Finding[];
  summary: string;
}

type AnalysisData = SingleAnalysis | ComparisonAnalysis | string;

interface LLMAnalysisProps {
  analysis: AnalysisData;
  title: string;
}

// ─── Finding severity config ──────────────────────────────────────────────────

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
};

const priorityConfig = {
  high: {
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    dot: 'bg-red-400',
  },
  medium: {
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    dot: 'bg-amber-400',
  },
  low: {
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    dot: 'bg-blue-400',
  },
};

// ─── Score color ──────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 9) return 'text-emerald-400';
  if (score >= 7) return 'text-blue-400';
  if (score >= 5) return 'text-amber-400';
  if (score >= 3) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBgColor(score: number): string {
  if (score >= 9) return 'bg-emerald-500';
  if (score >= 7) return 'bg-blue-500';
  if (score >= 5) return 'bg-amber-500';
  if (score >= 3) return 'bg-orange-500';
  return 'bg-red-500';
}

// ─── SQL copy button ──────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">{children}</span>
      <div className="flex-1 h-px bg-gray-700" />
    </div>
  );
}

// ─── Finding card ─────────────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: Finding }) {
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
      </div>
    </div>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────

function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
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

      {rec.sql && (
        <div className="border-t border-gray-700">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
            <span className="text-xs text-gray-500 font-mono">SQL</span>
            <CopyButton text={rec.sql} />
          </div>
          <SyntaxHighlighter
            language="sql"
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '1rem 1.5rem', fontSize: '0.8rem', background: '#0d1117' }}
          >
            {rec.sql}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

// ─── Single analysis layout ───────────────────────────────────────────────────

const scoreBarClass: Record<number, string> = {
  1: 'w-[10%]', 2: 'w-[20%]', 3: 'w-[30%]', 4: 'w-[40%]',
  5: 'w-[50%]', 6: 'w-[60%]', 7: 'w-[70%]', 8: 'w-[80%]',
  9: 'w-[90%]', 10: 'w-full',
};

function SingleAnalysisView({ data }: { data: SingleAnalysis }) {
  const score = Math.max(1, Math.min(10, data.efficiencyScore));

  return (
    <div className="space-y-8">
      {/* Score + summary */}
      <div className="flex gap-6 items-start p-5 rounded-xl bg-gray-800/60 border border-gray-700">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className={`text-5xl font-black leading-none ${scoreColor(score)}`}>{score}</div>
          <div className="text-gray-500 text-xs font-semibold mt-1">/ 10</div>
          <div className={`mt-2 text-xs font-bold uppercase tracking-wide ${scoreColor(score)}`}>
            {data.scoreLabel}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Performance score</span>
              <span>{score}/10</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${scoreBgColor(score)} ${scoreBarClass[score]}`}
              />
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{data.executionSummary}</p>
        </div>
      </div>

      {/* Key findings */}
      <div>
        <SectionHeader>Key Findings</SectionHeader>
        <div className="space-y-3">
          {data.findings.map((f, i) => <FindingCard key={i} finding={f} />)}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <SectionHeader>Recommendations</SectionHeader>
        <div className="space-y-4">
          {data.recommendations.map((r, i) => (
            <RecommendationCard key={i} rec={r} index={i} />
          ))}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <Zap size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              Bottom Line
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{data.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Comparison analysis layout ───────────────────────────────────────────────

function ComparisonAnalysisView({ data }: { data: ComparisonAnalysis }) {
  const winnerLabel =
    data.winner === 'tie' ? 'Tie — Both plans equivalent' : `Plan ${data.winner} wins`;

  const winnerColor =
    data.winner === 'A'
      ? 'text-blue-400'
      : data.winner === 'B'
        ? 'text-purple-400'
        : 'text-gray-400';

  const marginConfig = {
    significant: { label: 'Significant advantage', color: 'text-emerald-400' },
    marginal: { label: 'Marginal advantage', color: 'text-amber-400' },
    equal: { label: 'Equal performance', color: 'text-gray-400' },
  };

  const margin = marginConfig[data.winnerMargin];

  return (
    <div className="space-y-8">
      {/* Winner banner */}
      <div className="flex gap-4 items-center p-5 rounded-xl bg-gray-800/60 border border-gray-700">
        <Trophy size={36} className={`flex-shrink-0 ${winnerColor}`} />
        <div className="flex-1">
          <div className={`text-2xl font-black leading-none ${winnerColor}`}>{winnerLabel}</div>
          <div className={`text-xs font-semibold mt-1 ${margin.color}`}>{margin.label}</div>
          <p className="text-gray-300 text-sm mt-2 leading-relaxed">{data.winnerSummary}</p>
        </div>
      </div>

      {/* Key differences table */}
      {data.keyDifferences?.length > 0 && (
        <div>
          <SectionHeader>Key Differences</SectionHeader>
          <div className="rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">
                    Aspect
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    Plan A
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Plan B
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                    Winner
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {data.keyDifferences.map((diff, i) => (
                  <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-300 whitespace-nowrap">
                      {diff.aspect}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{diff.planA}</td>
                    <td className="px-4 py-3 text-gray-400">{diff.planB}</td>
                    <td className="px-4 py-3 text-center">
                      {diff.winner === 'tie' ? (
                        <span className="text-gray-500 text-xs">—</span>
                      ) : (
                        <span
                          className={`text-xs font-bold ${diff.winner === 'A' ? 'text-blue-400' : 'text-purple-400'}`}
                        >
                          Plan {diff.winner}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Findings */}
      <div>
        <SectionHeader>Key Findings</SectionHeader>
        <div className="space-y-3">
          {data.findings.map((f, i) => <FindingCard key={i} finding={f} />)}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <ArrowRight size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              Takeaway
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{data.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fallback markdown renderer ───────────────────────────────────────────────

function MarkdownFallback({ text }: { text: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none text-gray-300 whitespace-pre-wrap font-mono text-xs leading-relaxed">
      {text}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LLMAnalysis({ analysis, title }: LLMAnalysisProps) {
  const isSingle = (d: AnalysisData): d is SingleAnalysis =>
    typeof d === 'object' && d !== null && 'efficiencyScore' in d;

  const isComparison = (d: AnalysisData): d is ComparisonAnalysis =>
    typeof d === 'object' && d !== null && 'winner' in d;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700 bg-gray-800/50">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <h2 className="text-gray-100 font-bold text-base tracking-tight">{title}</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-500">AI-powered</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {isSingle(analysis) ? (
          <SingleAnalysisView data={analysis} />
        ) : isComparison(analysis) ? (
          <ComparisonAnalysisView data={analysis} />
        ) : (
          <MarkdownFallback text={typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)} />
        )}
      </div>
    </div>
  );
}
