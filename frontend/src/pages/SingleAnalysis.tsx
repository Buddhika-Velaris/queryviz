import { useState } from 'react';
import JsonInput from '../components/JsonInput';
import PlanVisualization from '../components/PlanVisualization';
import MetricsSummary from '../components/MetricsSummary';
import LLMAnalysis from '../components/LLMAnalysis';
import { analyzeSinglePlan } from '../services/api';
import { Terminal, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SingleAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async (jsonInput: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeSinglePlan(jsonInput);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze query plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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

      <JsonInput onSubmit={handleAnalyze} loading={loading} />

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
          <div className="flex gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-emerald-300 text-sm font-medium">Analysis complete</p>
              <p className="text-emerald-400/70 text-xs mt-0.5">
                Review the metrics, explore the execution tree, then read the AI recommendations below.
              </p>
            </div>
          </div>

          <MetricsSummary metrics={result.metrics} />
          <PlanVisualization plan={result.plan} />
          <LLMAnalysis analysis={result.analysis} title="AI Performance Analysis & Recommendations" />
        </div>
      )}
    </div>
  );
}
