import { useState } from 'react';
import { Loader2, ArrowLeftRight } from 'lucide-react';

interface ComparisonInputProps {
  onSubmit: (planA: string, planB: string) => void;
  loading: boolean;
  initialPlanA?: string;
  initialPlanB?: string;
}

interface PlanPanelProps {
  label: string;
  badge: string;
  badgeColor: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}

function PlanPanel({ label, badge, badgeColor, value, onChange, disabled }: PlanPanelProps) {
  return (
    <div className="flex flex-col bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 bg-gray-800/40">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
        >
          {badge}
        </span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-h-[300px] px-5 py-4 bg-transparent text-gray-300 font-mono text-xs leading-relaxed resize-none focus:outline-none placeholder-gray-700"
        placeholder={'[\n  {\n    "Plan": { ... },\n    "Execution Time": 0.0\n  }\n]'}
        disabled={disabled}
        spellCheck={false}
      />

      {/* Char count */}
      <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/20">
        <span className="text-xs text-gray-600 tabular-nums">
          {value.length > 0 ? `${value.length.toLocaleString()} chars` : 'Paste EXPLAIN JSON here'}
        </span>
      </div>
    </div>
  );
}

export default function ComparisonInput({ onSubmit, loading, initialPlanA, initialPlanB }: ComparisonInputProps) {
  const [planA, setPlanA] = useState(initialPlanA ?? '');
  const [planB, setPlanB] = useState(initialPlanB ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (planA.trim() && planB.trim()) onSubmit(planA, planB);
  };

  const ready = !loading && planA.trim().length > 0 && planB.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PlanPanel
          label="Original query plan"
          badge="Plan A"
          badgeColor="bg-blue-500/10 text-blue-400 border-blue-500/30"
          value={planA}
          onChange={setPlanA}
          disabled={loading}
        />
        <PlanPanel
          label="Optimized query plan"
          badge="Plan B"
          badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/30"
          value={planB}
          onChange={setPlanB}
          disabled={loading}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!ready}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Comparing…
            </>
          ) : (
            <>
              <ArrowLeftRight size={14} />
              Compare Plans
            </>
          )}
        </button>
      </div>
    </form>
  );
}
