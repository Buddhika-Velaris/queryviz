import { useState } from 'react';
import { explainNode } from '../services/api';

interface PlanNode {
  'Node Type': string;
  'Actual Total Time'?: number;
  'Actual Rows'?: number;
  'Plan Rows'?: number;
  'Total Cost'?: number;
  Plans?: PlanNode[];
  [key: string]: any;
}

interface PlanVisualizationProps {
  plan: any;
}

export default function PlanVisualization({ plan }: PlanVisualizationProps) {
  const rootPlan = Array.isArray(plan) ? plan[0]?.Plan : plan.Plan || plan;
  const totalTime = Array.isArray(plan) ? plan[0]?.['Execution Time'] : plan['Execution Time'] || rootPlan['Actual Total Time'] || 100;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Execution Plan Tree</h2>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span>Slow (&gt;50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
            <span>Moderate (25-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span>Fast (&lt;25%)</span>
          </div>
          <div className="ml-auto text-xs italic">💡 Click any node for AI explanation</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <PlanNodeComponent node={rootPlan} level={0} totalTime={totalTime} />
      </div>
    </div>
  );
}

function PlanNodeComponent({ node, level, totalTime }: { node: PlanNode; level: number; totalTime: number }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const actualTime = node['Actual Total Time'] || 0;
  const timePercentage = totalTime > 0 ? (actualTime / totalTime) * 100 : 0;
  const hasChildren = node.Plans && node.Plans.length > 0;
  
  const getBackgroundColor = () => {
    if (timePercentage > 50) return 'bg-red-100 border-red-400 hover:bg-red-200';
    if (timePercentage > 25) return 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200';
    return 'bg-green-100 border-green-400 hover:bg-green-200';
  };
  
  const getPerformanceIcon = () => {
    if (timePercentage > 50) return '🔴';
    if (timePercentage > 25) return '🟡';
    return '🟢';
  };

  const handleNodeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (explanation) {
      setExplanation(null);
      return;
    }
    
    setLoading(true);
    try {
      const result = await explainNode(node['Node Type']);
      setExplanation(result);
    } catch (error) {
      console.error('Failed to explain node:', error);
      setExplanation('Unable to load explanation. Click to try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-2" style={{ paddingLeft: `${level * 2}rem` }}>
      <div
        className={`p-3 border-l-4 rounded cursor-pointer transition-all ${getBackgroundColor()}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="text-gray-500 hover:text-gray-700 font-bold"
                >
                  {expanded ? '▼' : '▶'}
                </button>
              )}
              <span className="text-lg">{getPerformanceIcon()}</span>
              <span className="font-semibold text-gray-900">{node['Node Type']}</span>
              {node['Relation Name'] && (
                <span className="text-gray-600">on <span className="font-medium">{node['Relation Name']}</span></span>
              )}
              {node['Index Name'] && (
                <span className="text-blue-600">using <span className="font-medium">{node['Index Name']}</span></span>
              )}
              <button
                onClick={handleNodeClick}
                className="ml-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
              >
                {loading ? '...' : explanation ? '✕ Close' : 'ℹ️ Explain'}
              </button>
            </div>
            <div className="mt-1 text-sm text-gray-600 ml-8">
              <span className="font-medium">Rows:</span> {(node['Actual Rows'] || 0).toLocaleString()}
              <span className="ml-4 font-medium">Cost:</span> {node['Total Cost']?.toFixed(2) || 0}
              {actualTime > 0 && (
                <>
                  <span className="ml-4 font-medium">Time:</span>{' '}
                  <span className={timePercentage > 50 ? 'text-red-600 font-semibold' : ''}>
                    {actualTime.toFixed(2)}ms ({timePercentage.toFixed(1)}%)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {explanation && (
          <div className="mt-3 p-3 bg-white rounded border-2 border-blue-300 shadow-sm text-sm leading-relaxed">
            <div className="font-semibold text-blue-900 mb-1">💡 AI Explanation:</div>
            {explanation}
          </div>
        )}
        {loading && (
          <div className="mt-2 text-sm text-gray-500 italic">Loading AI explanation...</div>
        )}
      </div>
      {expanded && hasChildren && node.Plans!.map((childNode, index) => (
        <PlanNodeComponent key={index} node={childNode} level={level + 1} totalTime={totalTime} />
      ))}
    </div>
  );
}
