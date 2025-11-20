import { useState } from 'react';
import ComparisonInput from '../components/ComparisonInput';
import MetricsSummary from '../components/MetricsSummary';
import PlanVisualization from '../components/PlanVisualization';
import LLMAnalysis from '../components/LLMAnalysis';
import { comparePlans } from '../services/api';

export default function Comparison() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleCompare = async (planA: string, planB: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await comparePlans(planA, planB);
      setResult(data);
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
        <p className="text-gray-600">Compare two execution plans side-by-side to validate optimizations and understand performance differences.</p>
      </div>

      {!result && (
        <div className="mb-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔍</span>
            </div>
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
        <div className="mt-8">
          <LLMAnalysis analysis={result.comparison} title="AI-Powered Comparison Report" />
          
          <div className="mt-8 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-3">📊</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Side-by-Side Comparison</h3>
                <p className="text-sm text-gray-700">
                  Green metrics indicate better performance, red indicates worse. Click on any metric card to learn what it means.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="space-y-6">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-900">Plan A</h2>
                <span className="ml-3 text-sm text-gray-500">(Original)</span>
              </div>
              <MetricsSummary 
                metrics={result.planA.metrics} 
                comparison={result.planB.metrics}
                isBetter="A"
              />
              <PlanVisualization plan={result.planA.plan} />
            </div>

            <div className="space-y-6">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-900">Plan B</h2>
                <span className="ml-3 text-sm text-gray-500">(Optimized)</span>
              </div>
              <MetricsSummary 
                metrics={result.planB.metrics} 
                comparison={result.planA.metrics}
                isBetter="B"
              />
              <PlanVisualization plan={result.planB.plan} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
