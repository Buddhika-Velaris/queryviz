import { useState } from 'react';
import { Clock, Calculator, Rows3, Zap, HardDrive, Brain, Target, ChevronDown } from 'lucide-react';

interface Metrics {
  executionTime: number;
  totalCost: number;
  totalRows: number;
  sharedBlocksHit: number;
  sharedBlocksRead: number;
  planningTime?: number;
}

interface MetricsSummaryProps {
  metrics: Metrics;
  comparison?: Metrics;
  isBetter?: 'A' | 'B';
}

interface CardDef {
  key: keyof Metrics;
  label: string;
  icon: React.ElementType;
  format: (v: number) => string;
  lowerIsBetter: boolean;
  explanation: string;
  valueColor?: (v: number, cmp?: number) => string;
}

const cardDefs: CardDef[] = [
  {
    key: 'executionTime',
    label: 'Execution Time',
    icon: Clock,
    format: (v) => `${v.toFixed(2)} ms`,
    lowerIsBetter: true,
    explanation:
      'Wall-clock time from start to finish including all scans, joins, and sorts. This is the number that matters most to end users.',
  },
  {
    key: 'planningTime',
    label: 'Planning Time',
    icon: Brain,
    format: (v) => `${v.toFixed(2)} ms`,
    lowerIsBetter: true,
    explanation:
      'Time PostgreSQL spent choosing the best execution strategy before running the query. High values can indicate complex joins or stale statistics.',
  },
  {
    key: 'totalCost',
    label: 'Planner Cost',
    icon: Calculator,
    format: (v) => v.toFixed(1),
    lowerIsBetter: true,
    explanation:
      "PostgreSQL's internal unitless estimate used to compare plan alternatives. Lower is generally better but it's an estimate, not real time.",
  },
  {
    key: 'totalRows',
    label: 'Rows Returned',
    icon: Rows3,
    format: (v) => v.toLocaleString(),
    lowerIsBetter: false,
    explanation:
      'Total rows the query produced. A large mismatch between estimated and actual rows is a common cause of bad plan choices.',
  },
  {
    key: 'sharedBlocksHit',
    label: 'Cache Hits',
    icon: Zap,
    format: (v) => v.toLocaleString(),
    lowerIsBetter: false,
    explanation:
      'Data blocks (8 KB each) served from PostgreSQL shared_buffers (RAM). Higher is better — cache reads are ~10,000× faster than disk.',
    valueColor: (v) => (v > 0 ? 'text-emerald-400' : 'text-gray-300'),
  },
  {
    key: 'sharedBlocksRead',
    label: 'Disk Reads',
    icon: HardDrive,
    format: (v) => v.toLocaleString(),
    lowerIsBetter: true,
    explanation:
      'Blocks that had to be fetched from disk. Lower is better. Many disk reads suggest missing indexes, too little shared_buffers, or cold cache.',
    valueColor: (v) => (v > 1000 ? 'text-red-400' : v > 0 ? 'text-amber-400' : 'text-gray-300'),
  },
];

function cacheHitRatio(m: Metrics): number {
  const total = m.sharedBlocksHit + m.sharedBlocksRead;
  return total > 0 ? (m.sharedBlocksHit / total) * 100 : 100;
}

function ratioColor(r: number): string {
  if (r >= 95) return 'text-emerald-400';
  if (r >= 80) return 'text-amber-400';
  return 'text-red-400';
}

interface MetricCardProps {
  def: CardDef;
  value: number | undefined;
  comparison?: number;
  hasComparison: boolean;
}

function MetricCard({ def, value, comparison, hasComparison }: MetricCardProps) {
  const [open, setOpen] = useState(false);

  if (value === undefined) return null;

  const Icon = def.icon;
  const formatted = def.format(value);

  let trend: 'better' | 'worse' | null = null;
  if (hasComparison && comparison !== undefined && value !== comparison) {
    const better = def.lowerIsBetter ? value < comparison : value > comparison;
    trend = better ? 'better' : 'worse';
  }

  const valueClass =
    def.valueColor?.(value, comparison) ??
    (trend === 'better'
      ? 'text-emerald-400'
      : trend === 'worse'
        ? 'text-red-400'
        : 'text-gray-100');

  const borderClass =
    trend === 'better'
      ? 'border-emerald-500/40'
      : trend === 'worse'
        ? 'border-red-500/40'
        : 'border-gray-700';

  return (
    <div className={`bg-gray-800/50 rounded-xl border ${borderClass} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={14} className="text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-500 truncate">{def.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {trend === 'better' && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                ↓ better
              </span>
            )}
            {trend === 'worse' && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                ↑ worse
              </span>
            )}
            <ChevronDown
              size={12}
              className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        <div className={`text-2xl font-black mt-2 tabular-nums leading-none ${valueClass}`}>
          {formatted}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-700/60">
          <p className="text-gray-400 text-xs leading-relaxed pt-3">{def.explanation}</p>
        </div>
      )}
    </div>
  );
}

export default function MetricsSummary({ metrics, comparison }: MetricsSummaryProps) {
  const ratio = cacheHitRatio(metrics);
  const hasComparison = !!comparison;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
        <div>
          <h2 className="text-sm font-bold text-gray-100">Performance Metrics</h2>
          <p className="text-xs text-gray-500 mt-0.5">Click any card to see what it means</p>
        </div>
        {/* Cache hit ratio pill */}
        <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5">
          <Target size={13} className={ratioColor(ratio)} />
          <span className={`text-sm font-black tabular-nums ${ratioColor(ratio)}`}>
            {ratio.toFixed(0)}%
          </span>
          <span className="text-xs text-gray-500">cache hit</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {cardDefs.map((def) => (
          <MetricCard
            key={def.key}
            def={def}
            value={metrics[def.key]}
            comparison={comparison?.[def.key]}
            hasComparison={hasComparison}
          />
        ))}
      </div>
    </div>
  );
}
