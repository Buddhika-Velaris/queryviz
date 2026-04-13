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

interface PlanFlowchartProps {
  plan: any;
}

export default function PlanFlowchart({ plan }: PlanFlowchartProps) {
  const rootPlan = Array.isArray(plan) ? plan[0]?.Plan : plan.Plan || plan;
  const totalTime = Array.isArray(plan) ? plan[0]?.['Execution Time'] : plan['Execution Time'] || rootPlan['Actual Total Time'] || 100;

  // Flatten the tree into a linear array for flowchart display
  const flattenNodes = (node: PlanNode, depth: number = 0): Array<{ node: PlanNode; depth: number }> => {
    const result: Array<{ node: PlanNode; depth: number }> = [{ node, depth }];
    if (node.Plans && node.Plans.length > 0) {
      node.Plans.forEach(child => {
        result.push(...flattenNodes(child, depth + 1));
      });
    }
    return result;
  };

  const nodes = flattenNodes(rootPlan);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {nodes.map((item, index) => (
        <div key={index} className="w-full max-w-2xl">
          <FlowchartNode 
            node={item.node} 
            totalTime={totalTime}
            isFirst={index === 0}
          />
          {index < nodes.length - 1 && (
            <div className="flex justify-center my-2">
              <svg width="24" height="24" className="text-gray-600">
                <path d="M12 0 L12 20 M6 14 L12 20 L18 14" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FlowchartNode({ 
  node, 
  totalTime,
  isFirst 
}: { 
  node: PlanNode; 
  totalTime: number;
  isFirst: boolean;
}) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const actualTime = node['Actual Total Time'] || 0;
  const actualRows = node['Actual Rows'] || 0;
  const planRows = node['Plan Rows'] || 0;
  const timePercentage = totalTime > 0 ? (actualTime / totalTime) * 100 : 0;
  
  const isHotspot = timePercentage > 50;
  const isScan = node['Node Type'].toLowerCase().includes('scan');
  const isJoin = node['Node Type'].toLowerCase().includes('join') || node['Node Type'].toLowerCase().includes('hash');
  const isSort = node['Node Type'].toLowerCase().includes('sort');
  const isLimit = node['Node Type'].toLowerCase().includes('limit');
  
  const getNodeColor = () => {
    if (isLimit) return 'bg-gray-600 border-gray-500';
    if (isHotspot) return 'bg-red-800 border-red-600';
    if (isSort) return 'bg-orange-700 border-orange-600';
    if (isJoin) return 'bg-blue-700 border-blue-600';
    if (isScan) return 'bg-teal-700 border-teal-600';
    return 'bg-gray-700 border-gray-600';
  };

  const handleNodeClick = async () => {
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

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`${getNodeColor()} border-2 rounded-lg p-4 min-w-[300px] max-w-2xl cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={handleNodeClick}
      >
        <div className="text-center">
          <div className="text-white font-semibold text-lg mb-1">
            {node['Node Type']}
            {node['Relation Name'] && ` (${node['Relation Name']})`}
          </div>
          <div className="text-gray-200 text-sm">
            {node['Index Name'] && (
              <div>using {node['Index Name']}</div>
            )}
            {planRows > 0 && (
              <div className="mt-1">
                {planRows !== actualRows ? (
                  <>emits {actualRows.toLocaleString()} rows (est. {planRows.toLocaleString()})</>
                ) : (
                  <>emits {actualRows.toLocaleString()} rows</>
                )}
              </div>
            )}
            {node['Filter'] && (
              <div className="text-xs mt-1">filter: {node['Filter']}</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Annotations on the side */}
      {(isHotspot || node['Shared Blocks Read']) && (
        <div className="mt-2 border-2 border-dashed border-orange-600 rounded px-3 py-1 text-xs text-orange-400 bg-gray-800">
          {isHotspot && actualTime > 0 && (
            <div>⚠️ Temp I/O spill</div>
          )}
          {node['Shared Blocks Read'] && node['Shared Blocks Read'] > 0 && (
            <div>{node['Shared Blocks Read'].toLocaleString()} blocks written to disk</div>
          )}
        </div>
      )}
      
      {explanation && (
        <div className="mt-3 p-4 bg-gray-800 border border-gray-700 rounded max-w-2xl w-full">
          <div className="text-blue-400 font-semibold mb-2">💡 AI Explanation:</div>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            className="prose prose-sm prose-invert max-w-none text-gray-300 text-xs"
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
      
      {loading && (
        <div className="mt-2 text-sm text-gray-400">Loading explanation...</div>
      )}
    </div>
  );
}
