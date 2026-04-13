import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    <div className="bg-gray-900 p-6 rounded-lg shadow-md font-mono text-sm">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-100 mb-4">NODE-BY-NODE TIMING (ACTUAL VS ESTIMATED ROWS)</h2>
      </div>
      <div className="overflow-x-auto">
        <PlanNodeComponent node={rootPlan} level={0} totalTime={totalTime} isLast={true} parentPrefix="" />
      </div>
    </div>
  );
}

function PlanNodeComponent({ 
  node, 
  level, 
  totalTime, 
  isLast, 
  parentPrefix 
}: { 
  node: PlanNode; 
  level: number; 
  totalTime: number; 
  isLast: boolean;
  parentPrefix: string;
}) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const actualTime = node['Actual Total Time'] || 0;
  const actualRows = node['Actual Rows'] || 0;
  const planRows = node['Plan Rows'] || 0;
  const timePercentage = totalTime > 0 ? (actualTime / totalTime) * 100 : 0;
  const hasChildren = node.Plans && node.Plans.length > 0;
  
  const rowDiff = planRows > 0 ? Math.abs((actualRows - planRows) / planRows * 100) : 0;
  const isRowEstimateOff = rowDiff > 50;
  const isHotspot = timePercentage > 50;
  const isFast = actualTime < 1;
  
  const getTimingColor = () => {
    if (isHotspot) return 'bg-orange-500';
    if (timePercentage > 25) return 'bg-blue-500';
    return 'bg-green-500';
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
      setExplanation('Unable to load explanation.');
    } finally {
      setLoading(false);
    }
  };

  const connector = level === 0 ? '' : isLast ? '└── ' : '├── ';
  const currentPrefix = parentPrefix + (level === 0 ? '' : isLast ? '    ' : '│   ');

  return (
    <>
      <div className="flex items-start justify-between py-1 hover:bg-gray-800 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 whitespace-pre">{parentPrefix}{connector}</span>
            
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="text-gray-400 hover:text-gray-200 px-1"
              >
                {expanded ? '▼' : '▶'}
              </button>
            )}
            
            <span className="text-gray-200 font-medium">
              {node['Node Type']}
              {node['Relation Name'] && ` → ${node['Relation Name']}`}
            </span>
            
            <button
              onClick={handleNodeClick}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                explanation 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 opacity-60 group-hover:opacity-100'
              }`}
              title={explanation ? 'Hide AI explanation' : 'Show AI explanation'}
            >
              {loading ? '⏳' : explanation ? '✕ Close AI' : 'ℹ️ AI'}
            </button>
            
            {isRowEstimateOff && (
              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded">row estimate off</span>
            )}
            
            {isHotspot && actualTime > 0 && (
              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded">~{actualTime.toFixed(0)}ms hotspot</span>
            )}
            
            {isFast && (
              <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">fast</span>
            )}
            
            {actualRows > 1000 && (
              <span className="px-2 py-0.5 bg-yellow-600 text-gray-900 text-xs rounded">{actualRows.toLocaleString()} rows</span>
            )}
            
            {node['Index Name'] && (
              <span className="text-gray-400 text-xs">using {node['Index Name']}</span>
            )}
          </div>
          
          {(planRows > 0 || node['Actual Loops']) && (
            <div className="ml-8 mt-1 text-gray-500 text-xs">
              {planRows > 0 && (
                <span>Estimated {planRows.toLocaleString()} rows • actual {actualRows.toLocaleString()} rows</span>
              )}
              {node['Actual Loops'] && node['Actual Loops'] > 1 && (
                <span className="ml-2">• {node['Actual Loops'].toLocaleString()} iterations on inner side</span>
              )}
              {node['Filter'] && (
                <span className="ml-2">• filter: {node['Filter']}</span>
              )}
            </div>
          )}
          
          {explanation && (
            <div className="ml-8 mt-2 p-3 bg-gray-800 border border-gray-700 rounded text-xs leading-relaxed">
              <div className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                💡 AI Explanation:
              </div>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm prose-invert max-w-none text-gray-300"
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  strong: ({node, ...props}) => <strong className="text-gray-100 font-bold" {...props} />,
                  em: ({node, ...props}) => <em className="text-gray-200 italic" {...props} />,
                  code: ({node, ...props}) => <code className="bg-gray-700 px-1 py-0.5 rounded text-blue-300" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
                }}
              >
                {explanation}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {actualTime > 0 && (
            <>
              <div className="w-32 h-2 bg-gray-700 rounded overflow-hidden">
                <div 
                  className={`h-full ${getTimingColor()}`}
                  style={{ width: `${Math.min(timePercentage, 100)}%` }}
                />
              </div>
              <span className="text-gray-300 w-16 text-right">{actualTime.toFixed(0)}ms</span>
            </>
          )}
        </div>
      </div>
      
      {expanded && hasChildren && node.Plans!.map((childNode, index) => (
        <PlanNodeComponent 
          key={index} 
          node={childNode} 
          level={level + 1} 
          totalTime={totalTime}
          isLast={index === node.Plans!.length - 1}
          parentPrefix={currentPrefix}
        />
      ))}
    </>
  );
}
