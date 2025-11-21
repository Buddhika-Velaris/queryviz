import { useState } from 'react';
import JsonInput from '../components/JsonInput';
import PlanVisualization from '../components/PlanVisualization';
import MetricsSummary from '../components/MetricsSummary';
import LLMAnalysis from '../components/LLMAnalysis';
import PerformanceScorecard from '../components/PerformanceScorecard';
import { analyzeSinglePlan } from '../services/api';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Single Query Analysis</h1>
        <p className="text-gray-600">Paste your PostgreSQL EXPLAIN output below to get AI-powered performance insights and optimization recommendations.</p>
      </div>

      {!result && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900 mb-2">How to get your query plan:</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Run in PostgreSQL: <code className="bg-blue-100 px-2 py-1 rounded text-xs">EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...</code></li>
                <li>Copy the entire JSON output from your database client</li>
                <li>Paste it in the textarea below and click "Analyze Query"</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <JsonInput onSubmit={handleAnalyze} loading={loading} />

      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
          <div className="flex">
            <span className="text-xl mr-2">⚠️</span>
            <div>
              <p className="font-medium">Error analyzing query plan</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Analysis Complete</h3>
                <p className="text-sm text-gray-700">
                  Your query plan has been analyzed. Review the performance scorecard, metrics, execution tree, and AI recommendations.
                </p>
              </div>
            </div>
          </div>

          {result.metrics.performanceScore && (
            <PerformanceScorecard scorecard={result.metrics.performanceScore} />
          )}
          <MetricsSummary metrics={result.metrics} />
          <PlanVisualization plan={result.plan} />
          <LLMAnalysis analysis={result.analysis} title="AI Performance Analysis & Recommendations" />
        </div>
      )}
    </div>
  );
}
