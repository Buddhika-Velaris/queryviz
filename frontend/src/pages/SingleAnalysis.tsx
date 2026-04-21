import JsonInput from '../components/JsonInput';
import PlanVisualization from '../components/PlanVisualization';
import MetricsSummary from '../components/MetricsSummary';
import LLMAnalysis from '../components/LLMAnalysis';
import { useEffect } from 'react';
import { analyzeSinglePlan, getHistoryRecord, type SingleAnalysisRecord } from '../services/api';
import { Terminal, CheckCircle2, AlertCircle, Trash2, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { recommendSectionsForPlan, saveLatestPlan, learnHref } from '../lib/sectionMap';
import { useAnalysisStore } from '../store/analysisStore';

function LoadingRecord({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 size={28} className="text-blue-400 animate-spin" />
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}

export default function SingleAnalysis() {
  const { id } = useParams<{ id: string }>();
  const {
    singleResult: result,
    singleError: error,
    singleLoading: loading,
    setSingleResult,
    setSingleError,
    setSingleLoading,
    clearSingle,
  } = useAnalysisStore();

  useEffect(() => {
    if (!id) return;
    setSingleLoading(true);
    setSingleError(null);
    getHistoryRecord<SingleAnalysisRecord>('single_analysis', id)
      .then((r) => setSingleResult({ plan: r.planJson, metrics: r.metrics, analysis: r.analysis }))
      .catch((err) => setSingleError(err.message || 'Failed to load record'))
      .finally(() => setSingleLoading(false));
  }, [id]);

  const handleAnalyze = async (jsonInput: string) => {
    setSingleLoading(true);
    setSingleError(null);

    try {
      const data = await analyzeSinglePlan(jsonInput);
      setSingleResult(data);
      saveLatestPlan(data.plan, data.metrics);
    } catch (err: any) {
      setSingleError(err.message || 'Failed to analyze query plan');
    } finally {
      setSingleLoading(false);
    }
  };

  return (
    <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {id && loading && !result && <LoadingRecord label="Loading analysis…" />}
      {id && loading && !result ? null : (
      <>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Single Query Analysis</h1>
        <p className="text-gray-500 text-sm">
          Paste your <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono text-xs">
            EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          </code> output to get AI-powered performance insights.
        </p>
      </div>

      {/* How-to tip — only shown before result */}
      {!result && (
        <div className="mb-6 flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Terminal size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 text-sm font-medium mb-1">How to get your query plan</p>
            <ol className="text-blue-400/80 text-xs space-y-1 list-decimal list-inside">
              <li>
                Run in psql or any client:{' '}
                <code className="bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                  EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT …
                </code>
              </li>
              <li>Copy the entire JSON output (the outer array including square brackets)</li>
              <li>Paste below and click Analyze</li>
            </ol>
          </div>
        </div>
      )}

      <JsonInput
        key={id ? (result ? `${id}-loaded` : `${id}-loading`) : (result ? 'with-result' : 'empty')}
        onSubmit={handleAnalyze}
        loading={loading}
        initialValue={result ? JSON.stringify(result.plan, null, 2) : ''}
      />

      {/* Error state */}
      {error && (
        <div className="mt-4 flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Analysis failed</p>
            <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Success banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-emerald-300 text-sm font-medium">Analysis complete</p>
              <p className="text-emerald-400/70 text-xs mt-0.5">
                Review the metrics, explore the execution tree, then read the AI recommendations below.
              </p>
            </div>
            <button
              type="button"
              onClick={clearSingle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 transition-colors flex-shrink-0"
              title="Clear results"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <MetricsSummary metrics={result.metrics} />
          <PlanVisualization plan={result.plan} />
          <LLMAnalysis analysis={result.analysis} title="AI Performance Analysis & Recommendations" />
          <RecommendedReading plan={result.plan} />
        </div>
      )}
      </>
      )}
    </div>
  );
}

function RecommendedReading({ plan }: { plan: any }) {
  const recs = recommendSectionsForPlan(plan);
  if (recs.length === 0) return null;

  return (
    <div className="rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-100">Recommended reading</h3>
        <span className="text-[11px] text-gray-500">— based on the operators in your plan</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {recs.map(r => (
          <Link
            key={r.number}
            to={learnHref(r.number)}
            className="group flex items-start gap-3 p-3 rounded-lg bg-gray-800/60 border border-gray-700/60 hover:border-blue-500/50 hover:bg-gray-800 transition-colors"
          >
            <span className="text-[10px] font-mono font-black text-gray-500 group-hover:text-blue-400 tabular-nums mt-0.5">
              §{r.number.toString().padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{r.title}</p>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                Triggered by: {r.reasons.slice(0, 3).join(', ')}
              </p>
            </div>
            <ArrowRight size={14} className="text-gray-600 group-hover:text-blue-400 flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
