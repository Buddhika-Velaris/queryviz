import { useState } from 'react';
import ComparisonInput from '../components/ComparisonInput';
import MetricsSummary from '../components/MetricsSummary';
import PlanVisualization from '../components/PlanVisualization';
import LLMAnalysis from '../components/LLMAnalysis';
import { comparePlans } from '../services/api';

type ActivePlan = 'A' | 'B';

export default function Comparison() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan>('A');

  const handleCompare = async (planA: string, planB: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await comparePlans(planA, planB);
      setResult(data);
      setActivePlan('A');
    } catch (err: any) {
      setError(err.message || 'Failed to compare query plans');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Compare Query Plans</h1>
        <p className="text-gray-600">
          Compare two execution plans side-by-side to validate optimizations and understand
          performance differences.
        </p>
      </div>

      {!result && (
        <div className="mb-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
          <div className="flex">
            <span className="text-2xl">🔍</span>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-purple-900 mb-2">When to use comparison:</h3>
              <ul className="list-disc list-inside text-sm text-purple-800 space-y-1">
                <li>Before and after adding an index</li>
                <li>Testing different query rewrites</li>
                <li>Validating configuration changes</li>
                <li>Understanding why one query is faster than another</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <ComparisonInput onSubmit={handleCompare} loading={loading} />

      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
          <div className="flex">
            <span className="text-xl mr-2">⚠️</span>
            <div>
              <p className="font-medium">Error comparing query plans</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {/* AI comparison report */}
          <LLMAnalysis analysis={result.comparison} title="AI-Powered Comparison Report" />

          {/* Plan switcher */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center border-b border-gray-700 px-4 pt-4 gap-2">
              {(['A', 'B'] as ActivePlan[]).map((plan) => {
                const isActive = activePlan === plan;
                const metrics = plan === 'A' ? result.planA.metrics : result.planB.metrics;
                const otherMetrics = plan === 'A' ? result.planB.metrics : result.planA.metrics;
                const isFaster =
                  metrics.executionTime > 0 &&
                  metrics.executionTime < otherMetrics.executionTime;
                const isSlower =
                  metrics.executionTime > 0 &&
                  metrics.executionTime > otherMetrics.executionTime;

                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setActivePlan(plan)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-colors border-b-2 -mb-px ${
                      isActive
                        ? 'bg-gray-800 border-blue-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {plan}
                    </span>
                    Plan {plan}
                    {metrics.executionTime > 0 && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          isFaster
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isSlower
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {metrics.executionTime.toFixed(1)} ms
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Speed delta badge */}
              {result.planA.metrics.executionTime > 0 &&
                result.planB.metrics.executionTime > 0 && (
                  <div className="ml-auto mb-1 flex items-center gap-2 text-xs text-gray-400">
                    <span>Δ</span>
                    <span
                      className={`font-semibold ${
                        result.improvement?.executionTime > 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {Math.abs(
                        result.planA.metrics.executionTime -
                          result.planB.metrics.executionTime,
                      ).toFixed(1)}{' '}
                      ms difference
                    </span>
                  </div>
                )}
            </div>

            {/* Active plan content */}
            <div className="p-4">
              {activePlan === 'A' ? (
                <div className="space-y-4">
                  <MetricsSummary
                    metrics={result.planA.metrics}
                    comparison={result.planB.metrics}
                    isBetter="A"
                  />
                  <PlanVisualization plan={result.planA.plan} />
                </div>
              ) : (
                <div className="space-y-4">
                  <MetricsSummary
                    metrics={result.planB.metrics}
                    comparison={result.planA.metrics}
                    isBetter="B"
                  />
                  <PlanVisualization plan={result.planB.plan} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
