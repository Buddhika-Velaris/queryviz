import { Link } from 'react-router-dom';
import {
  BarChart2, ArrowLeftRight, BookOpen, Zap, GitBranch,
  ChevronRight, AlertTriangle, CheckCircle2, Info, Search,
  MessageCircle, FlaskConical, Brain, Layers, ArrowRight,
} from 'lucide-react';

// ─── Section anchor links ──────────────────────────────────────────────────
interface TocItem {
  id: string;
  label: string;
}

const TOC: TocItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'getting-explain', label: 'Getting EXPLAIN output' },
  { id: 'single-analysis', label: 'Single query analysis' },
  { id: 'reading-results', label: 'Reading the results' },
  { id: 'compare', label: 'Comparing two plans' },
  { id: 'learn', label: 'Learn section' },
  { id: 'tips', label: 'Tips & best practices' },
];

// ─── Reusable layout blocks ────────────────────────────────────────────────
function SectionHeader({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="scroll-mt-20 mb-6">
      <h2 className="text-xl font-bold text-gray-100 mb-1">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
      <div className="mt-3 h-px bg-gradient-to-r from-blue-500/30 to-transparent" />
    </div>
  );
}

function Callout({
  icon: Icon,
  color,
  bg,
  title,
  children,
}: {
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${bg} mb-4`}>
      <Icon size={16} className={`${color} flex-shrink-0 mt-0.5`} />
      <div>
        <p className={`${color} text-sm font-medium mb-1`}>{title}</p>
        <div className="text-xs leading-relaxed opacity-80">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3 text-xs text-emerald-400 font-mono overflow-x-auto mb-4 leading-relaxed">
      {children}
    </pre>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
        <span className="text-blue-400 text-xs font-bold">{number}</span>
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-semibold text-gray-200 mb-2">{title}</p>
        <div className="text-gray-400 text-xs leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${color}`}>
      {children}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function Guide() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
          <BookOpen size={12} />
          User Guide
        </div>
        <h1 className="text-3xl font-black text-gray-100 tracking-tight mb-2">
          How to use QueryViz
        </h1>
        <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
          QueryViz turns raw PostgreSQL <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">EXPLAIN ANALYZE</code> output
          into interactive visualizations, AI-powered diagnostics, and actionable recommendations —
          no setup required.
        </p>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Table of contents (sticky sidebar) ── */}
        <aside className="hidden lg:block w-48 flex-shrink-0 sticky top-20">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">On this page</p>
          <nav className="space-y-1">
            {TOC.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors py-0.5"
              >
                <ChevronRight size={10} className="flex-shrink-0" />
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-gray-800 space-y-2">
            <Link
              to="/analyze"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <BarChart2 size={11} />
              Analyze a query
            </Link>
            <Link
              to="/compare"
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ArrowLeftRight size={11} />
              Compare plans
            </Link>
            <Link
              to="/learn"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <BookOpen size={11} />
              Learn
            </Link>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-12">

          {/* ── Overview ── */}
          <section>
            <SectionHeader
              id="overview"
              title="Overview"
              subtitle="What QueryViz does and when to use it."
            />

            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              QueryViz is a PostgreSQL query plan analyzer. It accepts the JSON output of{' '}
              <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono text-xs">
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
              </code>{' '}
              and produces three things:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  icon: GitBranch,
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10 border-blue-500/20',
                  title: 'Plan tree & flowchart',
                  desc: 'An interactive node-by-node breakdown of how PostgreSQL executed your query — with timing, row estimates, and per-node warnings.',
                },
                {
                  icon: Zap,
                  color: 'text-amber-400',
                  bg: 'bg-amber-500/10 border-amber-500/20',
                  title: 'AI diagnostics',
                  desc: 'An efficiency score, severity-ranked findings (sequential scans, row estimate errors, hash spills), and concrete SQL or index recommendations.',
                },
                {
                  icon: BarChart2,
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-500/10 border-emerald-500/20',
                  title: 'Key metrics',
                  desc: 'Planning time, execution time, total rows, buffers hit vs read — all surfaced clearly without digging through raw JSON.',
                },
                {
                  icon: ArrowLeftRight,
                  color: 'text-purple-400',
                  bg: 'bg-purple-500/10 border-purple-500/20',
                  title: 'Plan comparison',
                  desc: 'Paste two plans (before/after adding an index, or two query variants) and see a side-by-side diff with AI commentary on the winner.',
                },
              ].map(({ icon: Icon, color, bg, title, desc }) => (
                <div key={title} className={`rounded-xl border p-4 ${bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={color} />
                    <span className={`text-sm font-semibold ${color}`}>{title}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <Callout icon={Info} color="text-blue-300" bg="bg-blue-500/10 border-blue-500/20" title="No data is stored">
              <p className="text-blue-400/80">
                QueryViz does not persist your query plans. Everything is processed in-memory and discarded
                after the response. Your SQL and plan data never leave the request cycle.
              </p>
            </Callout>
          </section>

          {/* ── Getting EXPLAIN output ── */}
          <section>
            <SectionHeader
              id="getting-explain"
              title="Getting EXPLAIN output from PostgreSQL"
              subtitle="Copy the exact command and paste the result into QueryViz."
            />

            <Callout
              icon={AlertTriangle}
              color="text-amber-300"
              bg="bg-amber-500/10 border-amber-500/20"
              title="Use FORMAT JSON — not the default text format"
            >
              <p className="text-amber-400/80">
                QueryViz only accepts the JSON format. The default <code className="font-mono">EXPLAIN</code> text
                output will not work. Always include <code className="font-mono">FORMAT JSON</code> in your options.
              </p>
            </Callout>

            <Step number={1} title="Run EXPLAIN ANALYZE in psql or your SQL client">
              <p className="mb-2">Use the full option set for maximum detail:</p>
              <CodeBlock>{'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)\nSELECT u.id, u.name, o.total\nFROM users u\nJOIN orders o ON o.user_id = u.id\nWHERE u.created_at > now() - interval \'30 days\';'}</CodeBlock>
              <p>
                <strong className="text-gray-300">ANALYZE</strong> — actually executes the query and captures real timing and row counts.
                Without it you only get estimates.
              </p>
              <p className="mt-1">
                <strong className="text-gray-300">BUFFERS</strong> — shows buffer cache hits vs disk reads, revealing I/O pressure.
              </p>
            </Step>

            <Step number={2} title="Copy the entire JSON array output">
              <p className="mb-2">
                PostgreSQL returns an outer array. Copy everything including the square brackets{' '}
                <code className="text-emerald-400 font-mono bg-gray-800 px-1 py-0.5 rounded">[ … ]</code>:
              </p>
              <CodeBlock>{'[\n  {\n    "Plan": {\n      "Node Type": "Hash Join",\n      "Actual Total Time": 43.21,\n      ...\n    },\n    "Planning Time": 1.23,\n    "Execution Time": 43.87\n  }\n]'}</CodeBlock>
              <p>
                In <strong className="text-gray-300">psql</strong>: the output appears directly after running the command — select all lines and copy.
                In <strong className="text-gray-300">DBeaver / DataGrip / TablePlus</strong>: the result may appear in a result grid cell;
                right-click and choose "Copy as text" or "Copy cell value".
              </p>
            </Step>

            <Step number={3} title="Paste into QueryViz">
              <p>
                Go to <Link to="/analyze" className="text-blue-400 hover:text-blue-300 underline">Analyze</Link> (single plan)
                or <Link to="/compare" className="text-purple-400 hover:text-purple-300 underline">Compare</Link> (two plans),
                paste the JSON in the input box, and click the button.
              </p>
            </Step>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Minimum required flags</p>
              <div className="space-y-2">
                {[
                  { flag: 'ANALYZE', required: true, note: 'Executes the query; provides actual row counts and timings.' },
                  { flag: 'FORMAT JSON', required: true, note: 'Produces machine-readable output that QueryViz can parse.' },
                  { flag: 'BUFFERS', required: false, note: 'Adds buffer hit/miss stats. Highly recommended for I/O analysis.' },
                  { flag: 'VERBOSE', required: false, note: 'Adds column-level output info. Useful for complex projections.' },
                  { flag: 'SETTINGS', required: false, note: 'Shows any planner GUCs that differ from defaults.' },
                ].map(({ flag, required, note }) => (
                  <div key={flag} className="flex items-start gap-3 text-xs">
                    <code className="font-mono text-emerald-400 bg-gray-800 px-2 py-0.5 rounded flex-shrink-0 w-24 text-center">{flag}</code>
                    <span className="flex-shrink-0 mt-0.5">
                      {required ? (
                        <Badge color="bg-red-500/15 text-red-400">required</Badge>
                      ) : (
                        <Badge color="bg-gray-700 text-gray-400">optional</Badge>
                      )}
                    </span>
                    <span className="text-gray-500">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Single analysis ── */}
          <section>
            <SectionHeader
              id="single-analysis"
              title="Single query analysis"
              subtitle="Walk-through of the Analyze page."
            />

            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The <Link to="/analyze" className="text-blue-400 hover:text-blue-300 underline">Analyze</Link> page
              handles a single <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono text-xs">
                EXPLAIN ANALYZE
              </code> output. Use it to diagnose a slow query or understand an unfamiliar plan.
            </p>

            <div className="space-y-5">
              {[
                {
                  title: 'Paste your JSON and click Analyze',
                  body: (
                    <p>
                      The input box accepts the raw JSON array. Click <strong className="text-gray-200">Analyze Query</strong>.
                      The API runs the AI pipeline and returns results in a few seconds. Results are cached
                      client-side for your session, so navigating away and back does not re-submit.
                    </p>
                  ),
                },
                {
                  title: 'Review the metrics summary',
                  body: (
                    <p>
                      The metrics strip at the top shows <strong className="text-gray-200">planning time</strong>,{' '}
                      <strong className="text-gray-200">execution time</strong>, <strong className="text-gray-200">total rows</strong>,
                      and <strong className="text-gray-200">buffer usage</strong>. These are your headline numbers
                      — if execution time is unexpectedly high, the plan tree will show you exactly which node is
                      responsible.
                    </p>
                  ),
                },
                {
                  title: 'Explore the plan visualization',
                  body: (
                    <>
                      <p className="mb-2">
                        The plan appears as a collapsible tree. Each node shows its type, cost,
                        actual vs estimated rows, and time contribution. Click any node to see an
                        AI-generated plain-English explanation of what that node is doing and why it might
                        be a bottleneck.
                      </p>
                      <p>
                        Switch to the <strong className="text-gray-200">Flowchart</strong> tab for a branching
                        diagram view — useful for understanding join order and sub-plan relationships at a glance.
                      </p>
                    </>
                  ),
                },
                {
                  title: 'Read the AI analysis',
                  body: (
                    <p>
                      Below the visualization, the AI analysis lists <strong className="text-gray-200">findings</strong>{' '}
                      ranked by severity ({' '}
                      <Badge color="bg-red-500/15 text-red-400">critical</Badge>{' '}
                      <Badge color="bg-amber-500/15 text-amber-400">warning</Badge>{' '}
                      <Badge color="bg-blue-500/15 text-blue-400">info</Badge>{' '}
                      ) and a set of <strong className="text-gray-200">recommendations</strong> — e.g. which index
                      to create, which join hint to try, or which config knob to adjust.
                    </p>
                  ),
                },
                {
                  title: 'Follow the Learn link',
                  body: (
                    <p>
                      After analysis, QueryViz suggests relevant Learn sections based on the node types in
                      your plan. Click the <strong className="text-gray-200 flex-inline">
                        <BookOpen size={12} className="inline mr-0.5" /> Learn more
                      </strong> banner to jump directly to the matching topic.
                    </p>
                  ),
                },
              ].map(({ title, body }, i) => (
                <Step key={title} number={i + 1} title={title}>{body}</Step>
              ))}
            </div>
          </section>

          {/* ── Reading results ── */}
          <section>
            <SectionHeader
              id="reading-results"
              title="Reading the results"
              subtitle="Understanding node colors, badges, and the AI output."
            />

            {/* Node type colors */}
            <p className="text-gray-400 text-sm mb-4">
              Each node in the plan tree is color-coded by type so you can spot scan types and joins at a glance:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {[
                { color: 'bg-blue-500/20 border-blue-500/30 text-blue-300', label: 'Sequential Scan', note: 'Full table scan — often the first thing to optimize.' },
                { color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300', label: 'Index Scan / Index Only Scan', note: 'Using an index to look up rows directly.' },
                { color: 'bg-purple-500/20 border-purple-500/30 text-purple-300', label: 'Hash Join', note: 'Builds a hash table from one side and probes with the other.' },
                { color: 'bg-amber-500/20 border-amber-500/30 text-amber-300', label: 'Nested Loop', note: 'For each row in the outer set, scans the inner set.' },
                { color: 'bg-pink-500/20 border-pink-500/30 text-pink-300', label: 'Merge Join', note: 'Joins two pre-sorted sets by merging them.' },
                { color: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300', label: 'Sort / Aggregate', note: 'Sorting or grouping rows — may spill to disk on large sets.' },
              ].map(({ color, label, note }) => (
                <div key={label} className={`rounded-lg border px-3 py-2.5 ${color.split(' ').slice(0, 2).join(' ')}`}>
                  <p className={`text-xs font-semibold mb-0.5 ${color.split(' ')[2]}`}>{label}</p>
                  <p className="text-gray-500 text-xs">{note}</p>
                </div>
              ))}
            </div>

            {/* Warning badges */}
            <p className="text-gray-400 text-sm mb-4">
              Nodes with performance concerns carry inline warning badges:
            </p>

            <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800 mb-6">
              {[
                {
                  badge: <Badge color="bg-red-500/15 text-red-400">row estimate off</Badge>,
                  desc: 'Actual rows returned differ significantly from the planner\'s estimate. This often leads to the planner choosing a suboptimal join strategy or index.',
                },
                {
                  badge: <Badge color="bg-amber-500/15 text-amber-400">seq scan</Badge>,
                  desc: 'A sequential scan reads every row in the table. On large tables this is a common culprit for slow queries — an index on the filter column may help.',
                },
                {
                  badge: <Badge color="bg-amber-500/15 text-amber-400">slow node</Badge>,
                  desc: 'This node accounts for a disproportionate share of total execution time.',
                },
                {
                  badge: <Badge color="bg-blue-500/15 text-blue-400">buffer misses</Badge>,
                  desc: 'Data had to be fetched from disk rather than the shared buffer cache. Indicates I/O pressure or a cold cache.',
                },
              ].map(({ badge, desc }, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-shrink-0 mt-0.5">{badge}</div>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Efficiency score */}
            <p className="text-gray-400 text-sm mb-3">
              The AI analysis includes an <strong className="text-gray-200">efficiency score</strong> from 0–100 that
              weighs row estimate accuracy, scan choices, join strategy appropriateness, and buffer efficiency.
              Use it as a relative signal rather than an absolute target — a score of 80 on a 100 ms query matters
              more than a score of 60 on a 1 ms query.
            </p>

            <Callout icon={CheckCircle2} color="text-emerald-300" bg="bg-emerald-500/10 border-emerald-500/20" title="Good scores to aim for">
              <ul className="list-disc list-inside text-emerald-400/80 space-y-0.5">
                <li>No sequential scans on large tables</li>
                <li>Actual rows within 2× of estimated rows</li>
                <li>No hash spills to disk (work_mem may be too low)</li>
                <li>Buffer hit ratio above 95%</li>
              </ul>
            </Callout>
          </section>

          {/* ── Comparison ── */}
          <section>
            <SectionHeader
              id="compare"
              title="Comparing two plans"
              subtitle="Use Compare when you want to validate that a change actually helped."
            />

            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The <Link to="/compare" className="text-purple-400 hover:text-purple-300 underline">Compare</Link> page
              accepts two separate <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono text-xs">
                EXPLAIN ANALYZE
              </code> outputs and shows them side-by-side with a difference summary.
            </p>

            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/40">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Common comparison workflows</p>
              </div>
              <div className="divide-y divide-gray-800">
                {[
                  {
                    label: 'Before & after adding an index',
                    detail: 'Run the query, capture the plan. Add the index. Run again, capture the new plan. Compare to confirm the index is being used and execution time improved.',
                  },
                  {
                    label: 'Query rewrite validation',
                    detail: 'Compare the original query plan against a rewritten version (e.g. EXISTS vs IN, subquery vs JOIN). The AI will explain which plan structure is more efficient and why.',
                  },
                  {
                    label: 'Configuration change testing',
                    detail: 'Test the effect of changing work_mem, enable_hashjoin, or enable_seqscan. Capture plans before and after with the same query.',
                  },
                  {
                    label: 'Understanding join strategy changes',
                    detail: 'If PostgreSQL switched from a Nested Loop to a Hash Join after a data volume increase, compare the old and new plans to understand the trade-off.',
                  },
                ].map(({ label, detail }) => (
                  <div key={label} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-300 mb-0.5">{label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <Step number={1} title="Paste Plan A in the left box">
              <p>Plan A is your baseline — the "before" plan, or the slower variant.</p>
            </Step>
            <Step number={2} title="Paste Plan B in the right box">
              <p>Plan B is your candidate — the "after" plan, or the faster variant.</p>
            </Step>
            <Step number={3} title="Click Compare Plans">
              <p>
                QueryViz runs both plans through the same analysis pipeline and produces a comparison
                with per-metric deltas and an AI summary of what changed structurally and timewise.
              </p>
            </Step>
            <Step number={4} title="Switch between plans in the visualization">
              <p>
                Use the A / B toggle above the plan tree to switch between plans and inspect individual
                nodes on each side. The AI comparison summary appears below both visualizations.
              </p>
            </Step>
          </section>

          {/* ── Learn ── */}
          <section>
            <SectionHeader
              id="learn"
              title="Learn section"
              subtitle="Interactive PostgreSQL query planning knowledge base."
            />

            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The <Link to="/learn" className="text-emerald-400 hover:text-emerald-300 underline">Learn</Link> page
              is a structured reference for PostgreSQL query execution concepts. It covers every major node
              type, join strategy, scan method, and planning heuristic — with interactive tools layered on top.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  icon: Search,
                  color: 'text-gray-400',
                  bg: 'bg-gray-800 border-gray-700',
                  title: 'Search & browse',
                  desc: 'Full-text search across all sections. Click any section to expand it and read the full explanation.',
                },
                {
                  icon: Zap,
                  color: 'text-amber-400',
                  bg: 'bg-amber-500/10 border-amber-500/20',
                  title: 'AI section summaries',
                  desc: 'Click the Summarize button on any section to get an AI-generated TL;DR with key takeaways.',
                },
                {
                  icon: MessageCircle,
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10 border-blue-500/20',
                  title: 'Ask questions',
                  desc: 'Type a question about any section and get a context-aware AI answer grounded in that section\'s content.',
                },
                {
                  icon: Brain,
                  color: 'text-purple-400',
                  bg: 'bg-purple-500/10 border-purple-500/20',
                  title: 'Flashcards',
                  desc: 'Practice terminology and concepts with AI-generated flashcards for any section. Flip to reveal the answer.',
                },
                {
                  icon: FlaskConical,
                  color: 'text-pink-400',
                  bg: 'bg-pink-500/10 border-pink-500/20',
                  title: 'Quizzes',
                  desc: 'Test your understanding with multiple-choice quizzes generated from section content.',
                },
                {
                  icon: Layers,
                  color: 'text-cyan-400',
                  bg: 'bg-cyan-500/10 border-cyan-500/20',
                  title: 'Practice scenarios',
                  desc: 'Get a realistic scenario (e.g. a slow query EXPLAIN output) and write the SQL fix. The AI grades your attempt.',
                },
              ].map(({ icon: Icon, color, bg, title, desc }) => (
                <div key={title} className={`rounded-xl border p-4 ${bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={13} className={color} />
                    <span className={`text-xs font-semibold ${color}`}>{title}</span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <Callout icon={Info} color="text-blue-300" bg="bg-blue-500/10 border-blue-500/20" title="Linked from analysis results">
              <p className="text-blue-400/80">
                After analyzing a query, QueryViz detects which node types appear in your plan and surfaces
                a direct link to the matching Learn sections. This lets you go from "why is my Hash Join slow?"
                to the relevant explanation in one click.
              </p>
            </Callout>
          </section>

          {/* ── Tips ── */}
          <section>
            <SectionHeader
              id="tips"
              title="Tips & best practices"
              subtitle="Getting the most out of QueryViz."
            />

            <div className="space-y-4">
              {[
                {
                  title: 'Always use ANALYZE — not plain EXPLAIN',
                  body: 'Plain EXPLAIN shows the planner\'s estimates but not actual execution. Row estimate errors are one of the most common sources of bad plans, and you can only see them with ANALYZE.',
                },
                {
                  title: 'Run the query multiple times before capturing the plan',
                  body: 'The first run may have a cold buffer cache, inflating read times. Run the query 2–3 times and capture the plan on a warm run for a representative baseline.',
                },
                {
                  title: 'Run ANALYZE on your tables if estimates are wildly off',
                  body: (
                    <>
                      <p>If row estimates are consistently wrong by 10× or more, your table statistics may be stale. Run:</p>
                      <CodeBlock>{'ANALYZE your_table;'}</CodeBlock>
                      <p>Or for all tables: <code className="text-emerald-400 font-mono bg-gray-800 px-1 py-0.5 rounded text-xs">ANALYZE;</code></p>
                    </>
                  ),
                },
                {
                  title: 'Use pg_stat_statements to find the queries to analyze',
                  body: (
                    <>
                      <p className="mb-2">Not sure which queries to focus on? Query the stats extension:</p>
                      <CodeBlock>{'SELECT query, calls, mean_exec_time, total_exec_time\nFROM pg_stat_statements\nORDER BY total_exec_time DESC\nLIMIT 10;'}</CodeBlock>
                    </>
                  ),
                },
                {
                  title: 'Increase work_mem if you see hash spills',
                  body: (
                    <>
                      <p className="mb-2">If the AI flags "disk spill" on a Hash or Sort node, temporarily increase work_mem for your session to test:</p>
                      <CodeBlock>{'SET work_mem = \'256MB\';\nEXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT …'}</CodeBlock>
                      <p>If the plan improves, consider raising it at the user or role level rather than globally.</p>
                    </>
                  ),
                },
                {
                  title: 'Compare plans with planner hints disabled',
                  body: (
                    <>
                      <p className="mb-2">To understand why PostgreSQL is choosing a particular strategy, disable that strategy and compare:</p>
                      <CodeBlock>{'-- Disable hash joins to force a different strategy\nSET enable_hashjoin = off;\nEXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT …'}</CodeBlock>
                      <p>Paste both plans into Compare to see the cost trade-off. Remember to reset: <code className="text-emerald-400 font-mono bg-gray-800 px-1 py-0.5 rounded text-xs">RESET enable_hashjoin;</code></p>
                    </>
                  ),
                },
              ].map(({ title, body }) => (
                <div key={title} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-200 mb-2">{title}</p>
                      <div className="text-gray-400 text-xs leading-relaxed">{body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                to="/analyze"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
              >
                <BarChart2 size={15} />
                Analyze a query
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/compare"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-semibold rounded-xl transition-colors"
              >
                <ArrowLeftRight size={15} />
                Compare two plans
              </Link>
              <Link
                to="/learn"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-semibold rounded-xl transition-colors"
              >
                <BookOpen size={15} />
                Browse Learn
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
