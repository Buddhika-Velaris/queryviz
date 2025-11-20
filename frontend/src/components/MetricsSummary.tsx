import { useState } from 'react';

interface MetricsSummaryProps {
  metrics: {
    executionTime: number;
    totalCost: number;
    totalRows: number;
    sharedBlocksHit: number;
    sharedBlocksRead: number;
    planningTime?: number;
  };
  comparison?: any;
  isBetter?: 'A' | 'B';
}

interface MetricCardProps {
  title: string;
  value: string;
  explanation: string;
  icon: string;
  className?: string;
  goodOrBad?: 'good' | 'bad' | 'neutral';
}

function MetricCard({ title, value, explanation, icon, className = '', goodOrBad = 'neutral' }: MetricCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  const getBorderColor = () => {
    if (goodOrBad === 'good') return 'border-green-300 bg-green-50';
    if (goodOrBad === 'bad') return 'border-red-300 bg-red-50';
    return 'border-gray-200 bg-gray-50';
  };

  return (
    <div 
      className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${getBorderColor()}`}
      onClick={() => setShowExplanation(!showExplanation)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <span className="text-2xl mr-2">{icon}</span>
          <div className="text-sm font-medium text-gray-600">{title}</div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 text-sm">
          {showExplanation ? '−' : 'ℹ'}
        </button>
      </div>
      <div className={className || 'text-2xl font-bold text-gray-900'}>
        {value}
      </div>
      {showExplanation && (
        <div className="mt-3 pt-3 border-t border-gray-300 text-sm text-gray-700 leading-relaxed">
          {explanation}
        </div>
      )}
    </div>
  );
}

export default function MetricsSummary({ metrics, comparison }: MetricsSummaryProps) {
  const getComparisonClass = (current: number, other: number, lowerIsBetter = true) => {
    if (!comparison) return '';
    const isCurrentBetter = lowerIsBetter ? current < other : current > other;
    return isCurrentBetter ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  };

  const getGoodOrBad = (current: number, other: number, lowerIsBetter = true): 'good' | 'bad' | 'neutral' => {
    if (!comparison) return 'neutral';
    const isCurrentBetter = lowerIsBetter ? current < other : current > other;
    return isCurrentBetter ? 'good' : 'bad';
  };

  const cacheHitRatio = metrics.sharedBlocksHit + metrics.sharedBlocksRead > 0
    ? (metrics.sharedBlocksHit / (metrics.sharedBlocksHit + metrics.sharedBlocksRead)) * 100
    : 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Performance Metrics</h2>
        <p className="text-sm text-gray-600">Click on any metric to learn what it means and why it matters</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Execution Time"
          value={`${metrics.executionTime.toFixed(2)} ms`}
          icon="⏱️"
          explanation="The total time PostgreSQL took to execute your query. Lower is better. This is the wall-clock time from start to finish, including all operations like scanning tables, joining data, and sorting results."
          className={comparison ? getComparisonClass(metrics.executionTime, comparison.executionTime) : 'text-2xl font-bold text-gray-900'}
          goodOrBad={comparison ? getGoodOrBad(metrics.executionTime, comparison.executionTime) : 'neutral'}
        />
        
        <MetricCard
          title="Total Cost"
          value={metrics.totalCost.toFixed(2)}
          icon="💰"
          explanation="PostgreSQL's estimated cost for executing this query plan. This is a unitless number used internally by the query planner to compare different execution strategies. Lower cost usually means faster execution, but it's an estimate, not actual time."
          className={comparison ? getComparisonClass(metrics.totalCost, comparison.totalCost) : 'text-2xl font-bold text-gray-900'}
          goodOrBad={comparison ? getGoodOrBad(metrics.totalCost, comparison.totalCost) : 'neutral'}
        />
        
        <MetricCard
          title="Total Rows"
          value={metrics.totalRows.toLocaleString()}
          icon="📊"
          explanation="The number of rows returned by your query. This doesn't necessarily indicate performance, but a mismatch between expected and actual rows can signal issues with statistics or query design."
          className="text-2xl font-bold text-gray-900"
          goodOrBad="neutral"
        />
        
        <MetricCard
          title="Blocks Hit (Cache)"
          value={metrics.sharedBlocksHit.toLocaleString()}
          icon="⚡"
          explanation="Number of data blocks (8KB chunks) found in PostgreSQL's shared buffer cache (RAM). Higher is better! Data from cache is read instantly without touching the disk, making queries much faster."
          className="text-2xl font-bold text-green-700"
          goodOrBad="neutral"
        />
        
        <MetricCard
          title="Blocks Read (Disk)"
          value={metrics.sharedBlocksRead.toLocaleString()}
          icon="💾"
          explanation="Number of data blocks that had to be read from disk. Lower is better! Disk reads are ~10,000x slower than cache reads. High disk reads suggest you need more shared_buffers, better indexes, or query optimization."
          className={comparison ? getComparisonClass(metrics.sharedBlocksRead, comparison.sharedBlocksRead) : `text-2xl font-bold ${metrics.sharedBlocksRead > 1000 ? 'text-red-600' : 'text-gray-900'}`}
          goodOrBad={comparison ? getGoodOrBad(metrics.sharedBlocksRead, comparison.sharedBlocksRead) : (metrics.sharedBlocksRead > 1000 ? 'bad' : 'neutral')}
        />

        {metrics.planningTime !== undefined && (
          <MetricCard
            title="Planning Time"
            value={`${metrics.planningTime.toFixed(2)} ms`}
            icon="🧠"
            explanation="Time PostgreSQL spent figuring out the best execution plan for your query. This happens before execution. High planning time can indicate complex queries with many joins or tables, or outdated statistics."
            className="text-2xl font-bold text-gray-900"
            goodOrBad="neutral"
          />
        )}

        <MetricCard
          title="Cache Hit Ratio"
          value={`${cacheHitRatio.toFixed(1)}%`}
          icon="🎯"
          explanation={`Percentage of data blocks served from cache vs disk. ${cacheHitRatio >= 90 ? 'Excellent! Your data is mostly cached.' : cacheHitRatio >= 70 ? 'Good, but could be better with more cache or better indexes.' : 'Low cache hit ratio suggests potential performance issues. Consider increasing shared_buffers or optimizing queries.'}`}
          className={`text-2xl font-bold ${cacheHitRatio >= 90 ? 'text-green-600' : cacheHitRatio >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
          goodOrBad={cacheHitRatio >= 90 ? 'good' : cacheHitRatio >= 70 ? 'neutral' : 'bad'}
        />
      </div>
    </div>
  );
}
