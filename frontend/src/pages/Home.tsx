import { Link } from 'react-router-dom';
import { BarChart2, ArrowLeftRight, Zap, GitBranch, Terminal, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: BarChart2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Visual Plan Tree',
    description:
      'Interactive, color-coded execution plan tree with per-node timing, row estimate accuracy, and AI explanations on click.',
  },
  {
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'AI-Powered Analysis',
    description:
      'Get an efficiency score, key findings with severity levels, and a full set of actionable recommendations — indexes, rewrites, config.',
  },
  {
    icon: ArrowLeftRight,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Plan Comparison',
    description:
      'Compare two execution plans side-by-side. See exactly which join strategy, index, or rewrite made the difference.',
  },
  {
    icon: GitBranch,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    title: 'Flowchart View',
    description:
      'Branching flowchart visualization mirrors the actual execution tree, with color-coded node types and side-annotation warnings.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Run EXPLAIN in PostgreSQL',
    code: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT …',
  },
  {
    step: '02',
    title: 'Copy the JSON output',
    code: '[ { "Plan": { … }, "Execution Time": 130.44 } ]',
  },
  {
    step: '03',
    title: 'Paste into QueryViz',
    code: '→ Analyze Query  or  → Compare Plans',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03] hero-grid" />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            PostgreSQL Performance Analyzer
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-[1.1] mb-6">
            Understand your
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              query plans
            </span>
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Paste a PostgreSQL <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-sm font-mono">EXPLAIN ANALYZE</code> output
            and get an AI-powered breakdown of bottlenecks, row estimate errors, missing indexes, and
            concrete SQL fixes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/analyze"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
            >
              <BarChart2 size={16} />
              Analyze a Query
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/compare"
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-semibold rounded-xl transition-colors"
            >
              <ArrowLeftRight size={16} />
              Compare Two Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Everything you need to tune queries</h2>
          <p className="text-gray-500 text-sm">From raw EXPLAIN JSON to actionable fixes in seconds.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, color, bg, title, description }) => (
            <div
              key={title}
              className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors"
            >
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-4 ${bg}`}>
                <Icon size={17} className={color} />
              </div>
              <h3 className="text-gray-100 font-semibold text-sm mb-2">{title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to use */}
      <section className="max-w-3xl mx-auto px-4 pb-24">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-800 bg-gray-800/40">
            <Terminal size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              How to get started
            </span>
          </div>

          <div className="divide-y divide-gray-800">
            {steps.map(({ step, title, code }) => (
              <div key={step} className="flex items-start gap-4 px-5 py-4">
                <span className="text-xs font-black text-gray-600 font-mono mt-0.5 w-5 flex-shrink-0">
                  {step}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-300 mb-1.5">{title}</div>
                  <code className="block text-xs text-emerald-400 font-mono bg-gray-800/60 px-3 py-2 rounded-lg truncate">
                    {code}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
