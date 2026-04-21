// Maps PostgreSQL plan-node types and concept keywords to a section number in
// the in-app PostgreSQL Guide (knowledge.md). Used by both the analyzer (deep
// links from plan nodes) and the Learn page (recommended reading + worked
// example).
//
// Section numbers match the Table of Contents in knowledge.md exactly.

export interface SectionRef {
  number: number;
  title: string;
}

const SECTIONS: SectionRef[] = [
  { number: 1,  title: 'Introduction to PostgreSQL' },
  { number: 2,  title: 'Schemas & Database Organization' },
  { number: 3,  title: 'Data Integrity & Constraints' },
  { number: 4,  title: 'Domain Types' },
  { number: 5,  title: 'NULL Handling & COALESCE Patterns' },
  { number: 6,  title: 'Time & Date Types' },
  { number: 7,  title: 'Numeric & ID Types' },
  { number: 8,  title: 'Sequences & Identity Columns' },
  { number: 9,  title: 'String & Text Types' },
  { number: 10, title: 'Character Sets, Collations & Encoding' },
  { number: 11, title: 'Casting & Type Conversion' },
  { number: 12, title: 'Binary Data & Bit Strings' },
  { number: 13, title: 'Network & MAC Address Types' },
  { number: 14, title: 'JSON Types' },
  { number: 15, title: 'Arrays' },
  { number: 16, title: 'Range Types' },
  { number: 17, title: 'Generated Columns' },
  { number: 18, title: 'Composite & Enum Types' },
  { number: 19, title: 'Full-Text Search' },
  { number: 20, title: 'Storage Internals — Pages, Disks & MVCC' },
  { number: 21, title: 'Indexes — Theory & Practice' },
  { number: 22, title: 'EXPLAIN & Query Analysis' },
  { number: 23, title: 'Joins' },
  { number: 24, title: 'Subqueries' },
  { number: 25, title: 'Lateral Joins' },
  { number: 26, title: 'SET Operations & Combining Queries' },
  { number: 27, title: 'Window Functions' },
  { number: 28, title: 'Grouping Sets, ROLLUP & CUBE' },
  { number: 29, title: 'CTEs (Common Table Expressions)' },
  { number: 30, title: 'Transactions & Concurrency Control' },
  { number: 31, title: 'Table Partitioning' },
  { number: 32, title: 'Views & Materialized Views' },
  { number: 33, title: 'Stored Procedures & Functions' },
  { number: 34, title: 'Triggers & Event-Driven Logic' },
  { number: 35, title: 'Roles, Privileges & Row-Level Security' },
  { number: 36, title: 'Performance Tuning & Configuration' },
  { number: 37, title: 'Vacuum, Autovacuum & Bloat Management' },
  { number: 38, title: 'Backup, Recovery & Replication' },
  { number: 39, title: 'Extensions' },
  { number: 40, title: 'pgvector & Semantic Search' },
  { number: 41, title: 'Utility Patterns & Recipes' },
  { number: 42, title: 'Quick Reference Cheatsheet' },
  { number: 43, title: 'Anti-Patterns to Avoid' },
];

const byNumber = new Map(SECTIONS.map(s => [s.number, s]));

const NODE_TYPE_TO_SECTION: Record<string, number> = {
  // Index access methods → 21. Indexes — Theory & Practice
  'Seq Scan': 21,
  'Sequential Scan': 21,
  'Index Scan': 21,
  'Index Only Scan': 21,
  'Bitmap Index Scan': 21,
  'Bitmap Heap Scan': 21,
  'Tid Scan': 21,
  'BitmapAnd': 21,
  'BitmapOr': 21,
  'Parallel Seq Scan': 21,

  // Join strategies → 23. Joins
  'Nested Loop': 23,
  'Hash Join': 23,
  'Merge Join': 23,
  'Hash': 23,

  // Subqueries → 24. Subqueries
  'Subquery Scan': 24,
  'SubPlan': 24,
  'Result': 24,

  // CTEs → 29. CTEs (Common Table Expressions)
  'CTE Scan': 29,
  'WorkTable Scan': 29,
  'Recursive Union': 29,

  // Window functions → 27. Window Functions
  'WindowAgg': 27,

  // Sorting / performance → 36. Performance Tuning & Configuration
  'Sort': 36,
  'Incremental Sort': 36,
  'Gather': 36,
  'Gather Merge': 36,

  // Grouping / aggregation → 28. Grouping Sets, ROLLUP & CUBE
  'Aggregate': 28,
  'GroupAggregate': 28,
  'HashAggregate': 28,
  'Group': 28,

  // Materialisation / views → 32. Views & Materialized Views
  'Materialize': 32,
  'Memoize': 32,

  // Partitioning → 31. Table Partitioning
  'Append': 31,
  'Merge Append': 31,
  'Partition Selector': 31,

  // Locking → 30. Transactions & Concurrency Control
  'LockRows': 30,

  // Storage internals → 20. Storage Internals — Pages, Disks & MVCC
  'Heap Fetch': 20,

  // Full-text search → 19. Full-Text Search
  'BitmapOr FTS': 19,
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
  if (!grouped.has(22)) {
    const r = byNumber.get(22);
    if (r) grouped.set(22, { ...r, reasons: ['EXPLAIN output'] });
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
