import { useState } from 'react';

interface ComparisonInputProps {
  onSubmit: (planA: string, planB: string) => void;
  loading: boolean;
}

export default function ComparisonInput({ onSubmit, loading }: ComparisonInputProps) {
  const [planA, setPlanA] = useState('');
  const [planB, setPlanB] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (planA.trim() && planB.trim()) {
      onSubmit(planA, planB);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan A (Original):
          </label>
          <textarea
            value={planA}
            onChange={(e) => setPlanA(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder='[{"Plan": {...}}]'
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan B (Optimized):
          </label>
          <textarea
            value={planB}
            onChange={(e) => setPlanB(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder='[{"Plan": {...}}]'
            disabled={loading}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading || !planA.trim() || !planB.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Comparing...' : 'Compare Plans'}
        </button>
      </div>
    </form>
  );
}
