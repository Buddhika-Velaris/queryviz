// Maps PostgreSQL plan-node types and concept keywords to a section number in
// the in-app PostgreSQL Guide (knowledge.md). Used by both the analyzer (deep
// links from plan nodes) and the Learn page (recommended reading + worked
// example).

export interface SectionRef {
  number: number;
  title: string;
}

const SECTIONS: SectionRef[] = [
  { number: 20, title: 'Indexes — Theory & Practice' },
  { number: 21, title: 'EXPLAIN & Query Analysis' },
  { number: 22, title: 'Joins' },
  { number: 23, title: 'Subqueries' },
  { number: 24, title: 'Lateral Joins' },
  { number: 26, title: 'Window Functions' },
  { number: 27, title: 'Grouping Sets, ROLLUP & CUBE' },
  { number: 28, title: 'CTEs (Common Table Expressions)' },
  { number: 29, title: 'Transactions & Concurrency Control' },
  { number: 30, title: 'Table Partitioning' },
  { number: 31, title: 'Views & Materialized Views' },
  { number: 35, title: 'Performance Tuning & Configuration' },
  { number: 36, title: 'Vacuum, Autovacuum & Bloat Management' },
];

const byNumber = new Map(SECTIONS.map(s => [s.number, s]));

const NODE_TYPE_TO_SECTION: Record<string, number> = {
  'Seq Scan': 20,
  'Sequential Scan': 20,
  'Index Scan': 20,
  'Index Only Scan': 20,
  'Bitmap Index Scan': 20,
  'Bitmap Heap Scan': 20,
  'Tid Scan': 20,
  'BitmapAnd': 20,
  'BitmapOr': 20,

  'Nested Loop': 22,
  'Hash Join': 22,
  'Merge Join': 22,
  'Hash': 22,

  'Subquery Scan': 23,
  'SubPlan': 23,
  'Result': 23,

  'CTE Scan': 28,
  'WorkTable Scan': 28,
  'Recursive Union': 28,

  'WindowAgg': 26,

  'Sort': 35,
  'Incremental Sort': 35,
  'Aggregate': 27,
  'GroupAggregate': 27,
  'HashAggregate': 27,
  'Group': 27,

  'Materialize': 31,
  'Memoize': 31,

  'Append': 30,
  'Merge Append': 30,
  'Partition Selector': 30,

  'Gather': 35,
  'Gather Merge': 35,
  'Parallel Seq Scan': 20,

  'LockRows': 29,
};

export function sectionForNodeType(nodeType: string): SectionRef | null {
  const num = NODE_TYPE_TO_SECTION[nodeType];
  if (num == null) return null;
  return byNumber.get(num) ?? null;
}

// Recursively walks a plan, returns unique node types in the order encountered.
export function collectNodeTypes(plan: any): string[] {
  const seen = new Set<string>();
  function walk(node: any): void {
    if (!node || typeof node !== 'object') return;
    const root = node.Plan ?? node;
    if (root && typeof root === 'object') {
      const type = root['Node Type'];
      if (typeof type === 'string') seen.add(type);
      const children = root.Plans;
      if (Array.isArray(children)) for (const c of children) walk(c);
    }
    if (Array.isArray(node)) for (const n of node) walk(n);
  }
  walk(plan);
  return Array.from(seen);
}

export interface RecommendedSection extends SectionRef {
  reasons: string[]; // one or more node types or keywords that triggered it
}

export function recommendSectionsForPlan(plan: any): RecommendedSection[] {
  const types = collectNodeTypes(plan);
  const grouped = new Map<number, RecommendedSection>();
  for (const t of types) {
    const ref = sectionForNodeType(t);
    if (!ref) continue;
    const existing = grouped.get(ref.number);
    if (existing) existing.reasons.push(t);
    else grouped.set(ref.number, { ...ref, reasons: [t] });
  }
  // EXPLAIN & Query Analysis is universally relevant.
  if (!grouped.has(21)) {
    const r = byNumber.get(21);
    if (r) grouped.set(21, { ...r, reasons: ['EXPLAIN output'] });
  }
  return Array.from(grouped.values());
}

// Deep-link href used across the app.
export function learnHref(sectionNumber: number): string {
  return `/learn?section=${sectionNumber}`;
}

export const LATEST_PLAN_KEY = 'queryviz:latest-plan';

export interface StoredPlan {
  plan: any;
  metrics: any;
  savedAt: string;
}

export function saveLatestPlan(plan: any, metrics: any): void {
  try {
    const payload: StoredPlan = { plan, metrics, savedAt: new Date().toISOString() };
    localStorage.setItem(LATEST_PLAN_KEY, JSON.stringify(payload));
  } catch {
    // quota / serialization — non-fatal.
  }
}

export function loadLatestPlan(): StoredPlan | null {
  try {
    const raw = localStorage.getItem(LATEST_PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPlan;
  } catch {
    return null;
  }
}

// Walks the stored plan and returns the first node matching one of the given
// node types (used to show a worked example for a given Learn section).
export function findFirstMatchingNode(plan: any, nodeTypes: string[]): any | null {
  const wanted = new Set(nodeTypes);
  let found: any = null;
  function walk(node: any): void {
    if (found || !node || typeof node !== 'object') return;
    const root = node.Plan ?? node;
    if (root && typeof root === 'object') {
      const type = root['Node Type'];
      if (typeof type === 'string' && wanted.has(type)) {
        found = root;
        return;
      }
      const children = root.Plans;
      if (Array.isArray(children)) for (const c of children) walk(c);
    }
    if (Array.isArray(node)) for (const n of node) walk(n);
  }
  walk(plan);
  return found;
}

// Inverse of NODE_TYPE_TO_SECTION: given a section number, which node types
// belong to it. Used by the worked-example feature.
export function nodeTypesForSection(sectionNumber: number): string[] {
  return Object.entries(NODE_TYPE_TO_SECTION)
    .filter(([, s]) => s === sectionNumber)
    .map(([t]) => t);
}
