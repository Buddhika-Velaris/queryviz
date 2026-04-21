import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, Trash2, ChevronDown, ChevronUp, BarChart2, ArrowLeftRight, ShieldCheck, Zap, RefreshCw, AlertCircle, ExternalLink, Loader2, BookOpen } from 'lucide-react';
import {
  getHistory,
  deleteHistoryRecord,
  type HistoryRecord,
  type HistoryRecordType,
  type SingleAnalysisRecord,
  type ComparisonRecord,
  type SchemaValidationRecord,
  type QueryGenerationRecord,
  type SuggestedReading,
} from '../services/api';

// ─── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<HistoryRecordType, { label: string; color: string; icon: React.ReactNode }> = {
  single_analysis: {
    label: 'Plan Analysis',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: <BarChart2 size={12} />,
  },
  comparison: {
    label: 'Comparison',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <ArrowLeftRight size={12} />,
  },
  schema_validation: {
    label: 'Schema Validation',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: <ShieldCheck size={12} />,
  },
  query_generation: {
    label: 'Query Generation',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: <Zap size={12} />,
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(s: string, max = 140): string {
  return s.length <= max ? s : s.slice(0, max).trimEnd() + '…';
}

// ─── Expandable detail sections ────────────────────────────────────────────────

function DetailBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-gray-200">{value}</div>
    </div>
  );
}

function PreBlock({ code }: { code: string }) {
  return (
    <pre className="text-xs bg-gray-950 rounded-lg p-3 overflow-x-auto text-gray-300 border border-gray-700 whitespace-pre-wrap break-words max-h-64">
      {code}
    </pre>
  );
}

/** Safely coerce a list item that may be a string or an object into a renderable string */
function itemText(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    // LLM recommendation objects: {title, description, priority, sql}
    const parts: string[] = [];
    if (o.title) parts.push(String(o.title));
    if (o.description) parts.push(String(o.description));
    if (o.sql) parts.push(String(o.sql));
    if (parts.length) return parts.join(' — ');
    return JSON.stringify(item);
  }
  return String(item);
}

function SingleAnalysisDetail({ record }: { record: SingleAnalysisRecord }) {
  const analysis = record.analysis as Record<string, any>;
  const metrics = record.metrics as Record<string, any>;
  return (
    <div className="space-y-4">
      <DetailBlock
        label="Execution time"
        value={<span className="font-mono text-blue-400">{metrics?.executionTime?.toFixed(3) ?? '—'} ms</span>}
      />
      {analysis?.summary && (
        <DetailBlock label="Summary" value={<p className="text-gray-300 leading-relaxed">{analysis.summary}</p>} />
      )}
      {analysis?.bottlenecks?.length > 0 && (
        <DetailBlock
          label="Bottlenecks"
          value={
            <ul className="list-disc list-inside space-y-0.5 text-gray-300">
              {analysis.bottlenecks.map((b: unknown, i: number) => <li key={i}>{itemText(b)}</li>)}
            </ul>
          }
        />
      )}
      {analysis?.recommendations?.length > 0 && (
        <DetailBlock
          label="Recommendations"
          value={
            <ul className="list-disc list-inside space-y-0.5 text-gray-300">
              {analysis.recommendations.map((r: unknown, i: number) => <li key={i}>{itemText(r)}</li>)}
            </ul>
          }
        />
      )}
    </div>
  );
}

function ComparisonDetail({ record }: { record: ComparisonRecord }) {
  const comp = record.comparison as any;
  const imp = record.improvement as any;
  const mA = record.metricsA as any;
  const mB = record.metricsB as any;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Plan A — Execution time</p>
          <p className="font-mono text-blue-400">{mA?.executionTime?.toFixed(3) ?? '—'} ms</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Plan B — Execution time</p>
          <p className="font-mono text-emerald-400">{mB?.executionTime?.toFixed(3) ?? '—'} ms</p>
        </div>
      </div>
      {imp && (
        <DetailBlock
          label="Improvement"
          value={
            <span className={`font-mono ${Number(imp.executionTime) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {imp.executionTime}% faster
            </span>
          }
        />
      )}
      {comp?.verdict && (
        <DetailBlock label="Verdict" value={<p className="text-gray-300 leading-relaxed">{itemText(comp.verdict)}</p>} />
      )}
      {comp?.summary && (
        <DetailBlock label="Summary" value={<p className="text-gray-300 leading-relaxed">{itemText(comp.summary)}</p>} />
      )}
      {comp?.recommendations?.length > 0 && (
        <DetailBlock
          label="Recommendations"
          value={
            <ul className="list-disc list-inside space-y-0.5 text-gray-300">
              {comp.recommendations.map((r: unknown, i: number) => <li key={i}>{itemText(r)}</li>)}
            </ul>
          }
        />
      )}
    </div>
  );
}

function SchemaValidationDetail({ record }: { record: SchemaValidationRecord }) {
  const r = record.result;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl font-bold tabular-nums text-purple-400">{r.overallScore}</div>
        <div>
          <p className="text-sm font-semibold text-gray-200">{r.scoreLabel}</p>
          <p className="text-xs text-gray-500">Schema quality score</p>
        </div>
      </div>
      {r.designSummary && (
        <DetailBlock label="Design summary" value={<p className="text-gray-300 leading-relaxed">{r.designSummary}</p>} />
      )}
      {r.findings?.length > 0 && (
        <DetailBlock
          label={`Findings (${r.findings.length})`}
          value={
            <ul className="space-y-1">
              {(r.findings as any[]).map((f: Record<string, any>, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-gray-300">
                  <span className={`mt-0.5 shrink-0 text-xs font-bold uppercase ${
                    f.severity === 'critical' ? 'text-red-400' :
                    f.severity === 'warning' ? 'text-amber-400' :
                    f.severity === 'info' ? 'text-blue-400' : 'text-emerald-400'
                  }`}>{f.severity}</span>
                  <span>{f.title}</span>
                </li>
              ))}
            </ul>
          }
        />
      )}
      <DetailBlock label="Input DDL" value={<PreBlock code={record.sql} />} />
    </div>
  );
}

function QueryGenerationDetail({ record }: { record: QueryGenerationRecord }) {
  const r = record.result;
  return (
    <div className="space-y-4">
      {r.notes && (
        <DetailBlock label="Notes" value={<p className="text-gray-300 leading-relaxed">{r.notes}</p>} />
      )}
      {r.queries?.length > 0 && (
        <DetailBlock
          label={`Generated queries (${r.queries.length})`}
          value={
            <div className="space-y-3">
              {(r.queries as any[]).map((q: Record<string, any>, i: number) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-xs text-amber-400 font-medium">{q.description}</p>
                  <PreBlock code={q.sql} />
                </div>
              ))}
            </div>
          }
        />
      )}
      {r.indexes?.length > 0 && (
        <DetailBlock
          label={`Recommended indexes (${r.indexes.length})`}
          value={
            <div className="space-y-2">
              {(r.indexes as any[]).map((idx: Record<string, any>, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`shrink-0 text-xs font-bold uppercase mt-0.5 ${
                    idx.impact === 'critical' ? 'text-red-400' :
                    idx.impact === 'recommended' ? 'text-amber-400' : 'text-gray-400'
                  }`}>{idx.impact}</span>
                  <code className="text-xs text-gray-300 font-mono">{idx.sql}</code>
                </div>
              ))}
            </div>
          }
        />
      )}
      <DetailBlock label="Access patterns" value={<PreBlock code={record.accessPatterns} />} />
      {r.suggestedReadings?.length > 0 && (
        <DetailBlock
          label="Recommended reading"
          value={
            <div className="space-y-2">
              {(r.suggestedReadings as SuggestedReading[]).map((s) => (
                <Link
                  key={s.number}
                  to={`/learn#section-${s.number}`}
                  className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-purple-500/40 hover:bg-purple-500/5 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 text-xs font-bold">{s.sectionRef}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 text-xs font-semibold group-hover:text-purple-300 transition-colors">{s.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{s.reason}</p>
                  </div>
                  <BookOpen size={12} className="text-gray-600 group-hover:text-purple-400 flex-shrink-0 mt-0.5 transition-colors" />
                </Link>
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}

function RecordDetail({ record }: { record: HistoryRecord }) {
  switch (record.recordType) {
    case 'single_analysis': return <SingleAnalysisDetail record={record} />;
    case 'comparison': return <ComparisonDetail record={record} />;
    case 'schema_validation': return <SchemaValidationDetail record={record} />;
    case 'query_generation': return <QueryGenerationDetail record={record} />;
  }
}

// ─── Record summary line (shown collapsed) ─────────────────────────────────────

function recordSummary(record: HistoryRecord): string {
  switch (record.recordType) {
    case 'single_analysis': {
      const m = record.metrics as any;
      return m?.executionTime != null ? `Execution time: ${m.executionTime.toFixed(3)} ms` : 'Plan analysis';
    }
    case 'comparison': {
      const imp = record.improvement as any;
      return imp?.executionTime != null ? `${imp.executionTime}% execution time change` : 'Plan comparison';
    }
    case 'schema_validation':
      return truncate(record.sql);
    case 'query_generation':
      return truncate(record.accessPatterns);
  }
}

// ─── History card ──────────────────────────────────────────────────────────────

function HistoryCard({
  record,
  onDelete,
}: {
  record: HistoryRecord;
  onDelete: (record: HistoryRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const meta = TYPE_META[record.recordType];

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this record?')) return;
    setDeleting(true);
    onDelete(record);
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    switch (record.recordType) {
      case 'single_analysis':
        navigate(`/analyze/${record._id}`);
        break;
      case 'comparison':
        navigate(`/compare/${record._id}`);
        break;
      case 'schema_validation':
        navigate(`/validate/${record._id}`);
        break;
      case 'query_generation':
        navigate(`/querygen/${record._id}`);
        break;
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <Clock size={15} className="text-gray-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
              {meta.icon}
              {meta.label}
            </span>
            <span className="text-xs text-gray-500">{formatDate(record.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-400 truncate">{recordSummary(record)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleOpen}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-400/10 transition-colors"
            title="Open in editor"
          >
            <ExternalLink size={12} />
            Open
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4">
          <RecordDetail record={record} />
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | HistoryRecordType;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'single_analysis', label: 'Analysis' },
  { key: 'comparison', label: 'Comparison' },
  { key: 'schema_validation', label: 'Schema' },
  { key: 'query_generation', label: 'Query Gen' },
];

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>('all');
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initial / tab-change load — resets the list
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNextCursor(null);
    try {
      const page = await getHistory(tab === 'all' ? undefined : tab);
      setRecords(page.records);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Load the next page and append
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await getHistory(tab === 'all' ? undefined : tab, nextCursor);
      setRecords((prev) => [...prev, ...page.records]);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor ?? null);
    } catch {
      // silently ignore — user can scroll again
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor, tab]);

  // IntersectionObserver — fires loadMore when sentinel enters the viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  function handleDelete(record: HistoryRecord) {
    setRecords((prev) => prev.filter((r) => r._id !== record._id));
    deleteHistoryRecord(record.recordType, record._id).catch(() => {
      setRecords((prev) =>
        [record, ...prev].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-blue-400" />
            History
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your past analyses, comparisons, and validations</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
              tab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <RefreshCw size={20} className="animate-spin" />
          <p className="text-sm">Loading history…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-400 gap-3">
          <AlertCircle size={20} />
          <p className="text-sm">{error}</p>
          <button onClick={load} className="text-xs underline text-gray-400 hover:text-gray-200">
            Try again
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600 gap-3">
          <Clock size={28} />
          <p className="text-sm">No records yet</p>
          <p className="text-xs text-gray-700">Run an analysis, comparison, or validation to see it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <HistoryCard key={record._id} record={record} onDelete={handleDelete} />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />

          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 size={18} className="text-gray-500 animate-spin" />
            </div>
          )}

          {!hasMore && records.length > 0 && (
            <p className="text-center text-xs text-gray-700 pt-2">
              {records.length} record{records.length !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
      )}
    </div>
  );
}
