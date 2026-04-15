import { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { explainNode } from '../services/api';

// ─── Domain types ─────────────────────────────────────────────────────────────

interface PlanNode {
  'Node Type': string;
  'Actual Total Time'?: number;
  'Actual Rows'?: number;
  'Plan Rows'?: number;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Filter'?: string;
  'Sort Key'?: string[];
  'Sort Method'?: string;
  'Hash Cond'?: string;
  'Temp Written Blocks'?: number;
  Plans?: PlanNode[];
  [key: string]: unknown;
}

interface PlanFlowchartProps {
  plan: unknown;
}

interface NodeData extends Record<string, unknown> {
  planNode: PlanNode;
  totalTime: number;
  timePercentage: number;
  annotation?: string;
  isSelected: boolean;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 280;
const NODE_H = 90;
const H_GAP = 80;
const V_GAP = 80;

// ─── Color helpers ────────────────────────────────────────────────────────────

function getNodeColors(node: PlanNode, pct: number): { bg: string; border: string } {
  const t = node['Node Type'].toLowerCase();
  const diskSpill = (node['Temp Written Blocks'] ?? 0) > 0;
  const hotspot = pct > 50 || diskSpill;

  if (t.includes('limit'))
    return { bg: '#4b5563', border: '#9ca3af' };
  if (hotspot && (t.includes('sort') || t.includes('hash') || t.includes('merge')))
    return { bg: '#7f1d1d', border: '#f87171' };
  if (t.includes('sort') || t.includes('windowagg') || t.includes('subquery') || t.includes('aggregate'))
    return { bg: '#78350f', border: '#f59e0b' };
  if (t.includes('hash') || t.includes('join') || t.includes('merge') || t.includes('nested'))
    return { bg: '#1e3a5f', border: '#3b82f6' };
  if (t.includes('scan') || t.includes('index'))
    return { bg: '#064e3b', border: '#10b981' };
  return { bg: '#374151', border: '#6b7280' };
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function getTitle(node: PlanNode): string {
  const type = node['Node Type'];
  const relation = node['Relation Name'];
  const actualRows = node['Actual Rows'];
  const hashCond = node['Hash Cond'];

  if (relation) {
    const rowStr = actualRows ? ` (${actualRows.toLocaleString()})` : '';
    return `${type}: ${relation}${rowStr}`;
  }
  if (hashCond) {
    const cond = (hashCond as string).length > 38
      ? `${(hashCond as string).substring(0, 38)}…`
      : hashCond;
    return `${type} (${cond})`;
  }
  return type;
}

function getSubtitle(node: PlanNode): string {
  const parts: string[] = [];

  const sortKeys = node['Sort Key'];
  if (sortKeys?.length) parts.push((sortKeys as string[]).slice(0, 2).join(', '));
  if (node['Sort Method']) parts.push(node['Sort Method'] as string);
  if (node['Index Name']) parts.push(`using ${node['Index Name']}`);

  const filter = node['Filter'];
  if (filter) {
    const f = filter as string;
    parts.push(f.length > 32 ? `${f.substring(0, 32)}…` : f);
  }

  const rows = node['Actual Rows'];
  const time = node['Actual Total Time'];

  if (!node['Relation Name'] && rows != null && (rows as number) > 0) {
    parts.push(`emits ${(rows as number).toLocaleString()} rows`);
  }
  if (time != null && (time as number) > 0) {
    parts.push(`${(time as number).toFixed(0)} ms`);
  }

  return parts.join(' · ');
}

// ─── Tree layout ──────────────────────────────────────────────────────────────

function subtreeWidth(node: PlanNode): number {
  const children = node.Plans ?? [];
  if (children.length === 0) return NODE_W;
  const total = children.reduce((s, c) => s + subtreeWidth(c), 0);
  return Math.max(NODE_W, total + (children.length - 1) * H_GAP);
}

function treeDepth(node: PlanNode): number {
  const children = node.Plans ?? [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(treeDepth));
}

function buildFlow(
  node: PlanNode,
  centerX: number,
  y: number,
  totalTime: number,
  nodes: Node[],
  edges: Edge[],
  ref: { n: number },
  selectedId: string | null,
  parentId?: string,
): string {
  const id = `n${ref.n++}`;
  const children = node.Plans ?? [];
  const actualTime = (node['Actual Total Time'] ?? 0) as number;
  const actualRows = (node['Actual Rows'] ?? 0) as number;
  const pct = totalTime > 0 ? (actualTime / totalTime) * 100 : 0;

  let annotation: string | undefined;
  const diskBlocks = (node['Temp Written Blocks'] ?? 0) as number;
  if (diskBlocks > 0) {
    annotation = `⚠ Temp I/O spill\n${diskBlocks.toLocaleString()} blocks written to disk`;
  } else if (children.length > 0) {
    const childRows = children.reduce((s, c) => s + ((c['Actual Rows'] ?? 0) as number), 0);
    if (childRows > 5000 && actualRows > 0 && actualRows < childRows * 0.005) {
      annotation = `${childRows.toLocaleString()} rows processed\nfor ${actualRows.toLocaleString()} result rows`;
    }
  }

  const data: NodeData = {
    planNode: node,
    totalTime,
    timePercentage: pct,
    annotation,
    isSelected: id === selectedId,
  };

  nodes.push({
    id,
    position: { x: centerX - NODE_W / 2, y },
    data,
    type: 'plan',
  });

  if (parentId !== undefined) {
    edges.push({
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      type: 'smoothstep',
      style: { stroke: '#9ca3af', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af', width: 14, height: 14 },
    });
  }

  if (children.length > 0) {
    const totalW =
      children.reduce((s, c) => s + subtreeWidth(c), 0) + (children.length - 1) * H_GAP;
    let cx = centerX - totalW / 2;
    for (const child of children) {
      const cw = subtreeWidth(child);
      buildFlow(child, cx + cw / 2, y + NODE_H + V_GAP, totalTime, nodes, edges, ref, selectedId, id);
      cx += cw + H_GAP;
    }
  }

  return id;
}

// ─── Custom node component ────────────────────────────────────────────────────

function FlowNode({ data }: NodeProps) {
  const { planNode, timePercentage, annotation, isSelected } = data as NodeData;
  const colors = getNodeColors(planNode, timePercentage);
  const title = getTitle(planNode);
  const subtitle = getSubtitle(planNode);

  return (
    <div style={{ width: NODE_W }} className="relative">
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />

      <div
        style={{
          background: colors.bg,
          borderColor: isSelected ? '#e2e8f0' : colors.border,
          borderWidth: isSelected ? 3 : 2,
          borderStyle: 'solid',
        }}
        className="rounded-xl cursor-pointer select-none px-4 py-3 text-center transition-all hover:brightness-110"
      >
        <div className="text-white font-bold text-sm leading-snug">{title}</div>
        {subtitle && (
          <div className="text-gray-300 text-xs mt-1 leading-snug opacity-85">{subtitle}</div>
        )}
      </div>

      {annotation && (
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: NODE_W + 14 }}
        >
          <div className="border-2 border-dashed border-orange-500 rounded-lg px-3 py-2 bg-gray-950 whitespace-nowrap">
            {annotation.split('\n').map((line, i) => (
              <p
                key={i}
                className={`text-xs ${i === 0 ? 'text-orange-400 font-semibold' : 'text-orange-300'}`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />
    </div>
  );
}

const nodeTypes = { plan: FlowNode };

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlanFlowchart({ plan }: PlanFlowchartProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedPlanNode, setSelectedPlanNode] = useState<PlanNode | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExpl, setLoadingExpl] = useState(false);

  const rootPlan = Array.isArray(plan)
    ? (plan as any[])[0]?.Plan
    : (plan as any)?.Plan ?? plan;

  const totalTime: number = Array.isArray(plan)
    ? (plan as any[])[0]?.['Execution Time']
    : (plan as any)?.['Execution Time'] ?? rootPlan?.['Actual Total Time'] ?? 100;

  const baseNodes = useMemo(() => {
    if (!rootPlan) return [] as Node[];
    const ns: Node[] = [];
    const es_dummy: Edge[] = [];
    const ref = { n: 0 };
    const sw = subtreeWidth(rootPlan);
    buildFlow(rootPlan, sw / 2, 20, totalTime, ns, es_dummy, ref, null);
    return ns;
  }, [rootPlan, totalTime]);

  const edges = useMemo(() => {
    if (!rootPlan) return [] as Edge[];
    const ns_dummy: Node[] = [];
    const es: Edge[] = [];
    const ref = { n: 0 };
    const sw = subtreeWidth(rootPlan);
    buildFlow(rootPlan, sw / 2, 20, totalTime, ns_dummy, es, ref, null);
    return es;
  }, [rootPlan, totalTime]);

  const nodes = useMemo(
    () =>
      baseNodes.map((n) => ({
        ...n,
        data: { ...n.data, isSelected: n.id === selectedNodeId },
      })),
    [baseNodes, selectedNodeId],
  );

  const canvasHeight = useMemo(() => {
    if (!rootPlan) return 300;
    return treeDepth(rootPlan) * (NODE_H + V_GAP) + 120;
  }, [rootPlan]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const planNode = (node.data as NodeData).planNode;
      if (node.id === selectedNodeId) {
        setSelectedNodeId(null);
        setSelectedPlanNode(null);
        setExplanation(null);
        return;
      }
      setSelectedNodeId(node.id);
      setSelectedPlanNode(planNode);
      setExplanation(null);
      setLoadingExpl(true);
      explainNode(planNode['Node Type'])
        .then((r) => setExplanation(r))
        .catch(() => setExplanation('Unable to load explanation.'))
        .finally(() => setLoadingExpl(false));
    },
    [selectedNodeId],
  );

  return (
    <div className="space-y-4">
      <div
        style={{ height: Math.max(420, canvasHeight) }}
        className="rounded-xl overflow-hidden border border-gray-700"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          colorMode="dark"
          style={{ background: '#111827' }}
        >
          <Background color="#1f2937" gap={24} variant={BackgroundVariant.Dots} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {selectedPlanNode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => {
            setSelectedNodeId(null);
            setSelectedPlanNode(null);
            setExplanation(null);
          }}
        >
          <div
            className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-100 font-semibold text-base">
                💡 AI Explanation:{' '}
                <span className="text-blue-400">{selectedPlanNode['Node Type']}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedNodeId(null);
                  setSelectedPlanNode(null);
                  setExplanation(null);
                }}
                className="text-gray-500 hover:text-gray-300 text-sm px-2 py-1 rounded hover:bg-gray-700 transition-colors"
              >
                ✕ Close
              </button>
            </div>
            {loadingExpl ? (
              <div className="text-gray-400 text-sm animate-pulse">Loading explanation…</div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm prose-invert max-w-none text-gray-300"
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="text-gray-100 font-bold">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-700 px-1 py-0.5 rounded text-blue-300 text-xs">
                      {children}
                    </code>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-300 text-sm">{children}</li>
                  ),
                }}
              >
                {explanation ?? ''}
              </ReactMarkdown>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
