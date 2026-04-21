import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Always loaded — foundational DDL rules that apply to every schema
// §5  NULL Handling — NOT NULL, COALESCE, nullable FK columns
// §20 Storage Internals (pages, MVCC, HOT updates) — foundational physical context
// §21 Indexes — Theory & Practice
// §43 Anti-Patterns — soft-delete, naming, common traps
const CORE_SECTIONS = [2, 3, 5, 7, 8, 9, 20, 21, 43];

// Loaded only when the submitted SQL contains matching syntax.
// Patterns are matched against comment-stripped, lowercased SQL.
const CONDITIONAL_SECTIONS: { section: number; pattern: RegExp }[] = [
  // §4 Domain Types
  { section: 4,  pattern: /\bcreate\s+domain\b/i },

  // §6 Time & Date — all PG date/time types + conventional column names
  { section: 6,  pattern: /\b(timestamp|timestamptz|date|interval|timetz|time\s*\()\b|\b\w+_(at|on)\b|\b(created|modified|updated|deleted|archived)\b/i },

  // §10 Collations & Encoding
  { section: 10, pattern: /\bcollate\b|\bcitext\b|\bcreate\s+collation\b/i },

  // §11 Casting & Type Conversion — explicit CAST() or :: cast operator in DDL
  { section: 11, pattern: /\bcast\s*\(|::[a-z]/i },

  // §12 Binary / Bit
  { section: 12, pattern: /\b(bytea|bit\s*\(|bit\s+varying|varbit)\b/i },

  // §13 Network types
  { section: 13, pattern: /\b(inet|cidr|macaddr8?)\b/i },

  // §14 JSON / JSONB (jsonb matched via \bjson prefix)
  { section: 14, pattern: /\bjsonb?\b/i },

  // §15 Arrays — "type[]" or ARRAY[
  { section: 15, pattern: /\w+\s*\[\s*\]|\barray\s*\[/i },

  // §16 Ranges & Multiranges (PG14+)
  { section: 16, pattern: /\b(int4range|int8range|numrange|tsrange|tstzrange|daterange|int4multirange|int8multirange|nummultirange|tsmultirange|tstzmultirange|datemultirange)\b/i },

  // §17 Generated Columns — "AS (expr)" but NOT "AS IDENTITY"
  { section: 17, pattern: /\bgenerated\s+(always|by\s+default)\s+as\s*\(/i },

  // §18 Composite & Enum Types
  { section: 18, pattern: /\bcreate\s+type\b/i },

  // §19 Full-Text Search
  { section: 19, pattern: /\b(tsvector|tsquery|to_tsvector|to_tsquery|ts_rank)\b/i },

  // §30 Transactions & Concurrency Control — DEFERRABLE / DEFERRED FK constraints
  { section: 30, pattern: /\bdeferrable\b|\binitially\s+(deferred|immediate)\b/i },

  // §31 Partitioning
  { section: 31, pattern: /\bpartition\s+(by|of)\b/i },

  // §32 Views / Materialized Views
  { section: 32, pattern: /\bcreate\s+(or\s+replace\s+)?(materialized\s+)?view\b/i },

  // §33 Stored Procedures & Functions
  { section: 33, pattern: /\bcreate\s+(or\s+replace\s+)?(function|procedure)\b/i },

  // §34 Triggers & Event-Driven Logic
  { section: 34, pattern: /\bcreate\s+(or\s+replace\s+)?trigger\b/i },

  // §35 Roles, Privileges, RLS
  { section: 35, pattern: /\brow\s+level\s+security\b|\bcreate\s+policy\b|\bcreate\s+role\b|\bgrant\s+|\brevoke\s+/i },

  // §36 Performance Tuning & Configuration — fillfactor, parallel_workers, storage params
  { section: 36, pattern: /\bfillfactor\b|\bparallel_workers\b|\bwith\s*\(\s*fillfactor/i },

  // §37 Vacuum, Autovacuum & Bloat Management — per-table autovacuum storage params
  { section: 37, pattern: /\bautovacuum_\w+\b|\bvacuum_\w+\b|\btoast\.autovacuum/i },

  // §39 Extensions
  { section: 39, pattern: /\bcreate\s+extension\b/i },

  // §40 pgvector — embeddings
  { section: 40, pattern: /\bvector\s*\(|\bhalfvec\s*\(|\bsparsevec\s*\(/i },
];

const MAX_CHARS_PER_SECTION = 2000;

interface ExtractedSection {
  number: number;
  title: string;
  content: string;
}

let cachedSections: Map<number, ExtractedSection> | null = null;

function findKnowledgePath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'knowledge.md');
    try {
      readFileSync(candidate, 'utf-8').slice(0, 1);
      return candidate;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error('knowledge.md not found — expected at repo root');
}

function parseAllSections(markdown: string): Map<number, ExtractedSection> {
  const lines = markdown.split('\n');
  const sections = new Map<number, ExtractedSection>();

  let currentNumber: number | null = null;
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    if (currentNumber !== null) {
      const content = currentLines.join('\n').trim();
      sections.set(currentNumber, {
        number: currentNumber,
        title: currentTitle,
        content: content.length > MAX_CHARS_PER_SECTION
          ? content.slice(0, MAX_CHARS_PER_SECTION) + '\n…[truncated]'
          : content,
      });
    }
  };

  for (const line of lines) {
    const match = line.match(/^## (\d+)\.\s+(.+)/);
    if (match) {
      flush();
      currentNumber = parseInt(match[1], 10);
      currentTitle = match[2].trim();
      currentLines = [];
    } else if (currentNumber !== null) {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

function getAllSections(): Map<number, ExtractedSection> {
  if (cachedSections) return cachedSections;
  const knowledgePath = findKnowledgePath();
  const markdown = readFileSync(knowledgePath, 'utf-8');
  cachedSections = parseAllSections(markdown);
  console.log(`[knowledge] Parsed ${cachedSections.size} sections from knowledge.md`);
  return cachedSections;
}

// Strip SQL comments so regex matches don't fire on commented-out code
function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

export function selectRelevantSections(sql: string): ExtractedSection[] {
  const all = getAllSections();
  const clean = stripComments(sql);

  const picked = new Set<number>(CORE_SECTIONS);
  for (const { section, pattern } of CONDITIONAL_SECTIONS) {
    if (pattern.test(clean)) picked.add(section);
  }

  const result: ExtractedSection[] = [];
  for (const num of [...picked].sort((a, b) => a - b)) {
    const s = all.get(num);
    if (s) result.push(s);
  }

  console.log(
    `[knowledge] Selected ${result.length} sections: ${result.map(s => `§${s.number}`).join(', ')}`,
  );
  return result;
}

export function sectionsAsPromptBlock(sql: string): string {
  const sections = selectRelevantSections(sql);
  return sections
    .map(s => `=== §${s.number}. ${s.title} ===\n${s.content}`)
    .join('\n\n');
}

// ─── Query-generation knowledge selection ────────────────────────────────────
// Sections always injected for query generation (DDL design + query execution
// fundamentals that apply regardless of access pattern).
const QUERY_CORE_SECTIONS = [
  5,   // NULL Handling & COALESCE Patterns
  7,   // Numeric & ID Types
  21,  // Indexes — Theory & Practice
  22,  // EXPLAIN & Query Analysis
  23,  // Joins — fundamental to any multi-table query
  24,  // Subqueries — derived tables, scalar subqueries, EXISTS, IN
  25,  // Lateral Joins — top-N per group, most-recent per entity
  43,  // Anti-Patterns to Avoid
];

// Additional sections triggered by keywords in the access pattern description
// or in the DDL itself.
const QUERY_CONDITIONAL_SECTIONS: { section: number; pattern: RegExp }[] = [
  // §6 Time & Date — date ranges, date_trunc, age(), generate_series, interval arithmetic
  { section: 6,  pattern: /\b(date|timestamp|time|interval|age\s*\(|date_trunc|generate_series|created_at|updated_at|ordered_at|_at\b|_on\b)/i },

  // §14 JSON — jsonb operators, json_agg, jsonb_set
  { section: 14, pattern: /\bjsonb?\b|json_agg|jsonb_set|json_build/i },

  // §15 Arrays — array_agg, unnest, ANY
  { section: 15, pattern: /\barray_agg\b|\bunnest\b|\bany\s*\(|\ball\s*\(|\w+\[\]|\barray\[/i },

  // §19 Full-Text Search — FTS function names OR semantic search/keyword language
  { section: 19, pattern: /\b(tsvector|tsquery|to_tsvector|to_tsquery|plainto_tsquery|websearch_to_tsquery|ts_rank|ts_headline|@@@|@@)\b|\bfull.?text\s+search\b|\bkeyword\s+search\b|\bsearch\s+(by\s+)?(name|title|description|body|content|keyword|query|term)\b|\bsearch\s+product|\bproduct\s+search\b|\bsearch\s+for\b|\bfuzzy\s+search\b|\btrigram\b|\bpg_trgm\b|\bilike\b|\bstemm|\bgin\s+index\b|\bfts\b/i },

  // §23 Joins — explicit join keywords OR multi-table / relationship language in access patterns
  { section: 23, pattern: /\bjoin\b|\bleft\s+join\b|\binner\s+join\b|\bcross\s+join\b|\bfull\s+outer\b|\banti.?join\b|\bself.?join\b|\brelat|\bforeign\s+key|\bfk\b/i },

  // §24 Subqueries — SQL keywords OR semantic phrases describing derived/scalar/filter patterns
  { section: 24, pattern: /\bsubquer\b|\bexists\s*\(|\bnot\s+exists\b|\bin\s*\(select|\bnot\s+in\b|\bderived\s+table\b|\bscalar\b|\bcorrelat|\baggregate.*filter|\bfilter.*aggregate|\baverage.*where|\bwhere.*average/i },

  // §25 Lateral Joins — explicit keyword OR semantic top-N / most-recent / per-group patterns
  { section: 25, pattern: /\blateral\b|\btop[\s-]?\d+\s+per\b|\btop[\s-]?n\b|\bmost[\s-]recent\b|\blatest\s+per\b|\bper[\s-](user|customer|product|order|group|category|entity)\b|\bper[\s-]row\b|\bco[\s-]?purchas|\bfrequently\s+bought|\bpeople\s+(also|who)\b|\brecommend/i },

  // §26 SET Operations — UNION, INTERSECT, EXCEPT
  { section: 26, pattern: /\bunion\b|\bintersect\b|\bexcept\b/i },

  // §27 Window Functions — rank, row_number, lag, lead, running totals, moving avg
  { section: 27, pattern: /\bover\s*\(|\bpartition\s+by\b|\brow_number\b|\brank\b|\bdense_rank\b|\blag\b|\blead\b|\bnth_value\b|\bntile\b|\bfirst_value\b|\blast_value\b|window function|running total|moving average/i },

  // §28 Grouping Sets, ROLLUP & CUBE
  { section: 28, pattern: /\brollup\b|\bcube\b|\bgrouping\s+sets\b|\bgrouping\s*\(/i },

  // §29 CTEs (WITH / RECURSIVE)
  { section: 29, pattern: /\bwith\b[\s\S]{0,20}\bselect\b|\bcte\b|\bcommon\s+table\s+express|\brecursive\b/i },

  // §30 Transactions & Concurrency — SELECT FOR UPDATE, SKIP LOCKED, advisory locks
  { section: 30, pattern: /\bfor\s+update\b|\bskip\s+locked\b|\bnowait\b|\badvisory\b|\bselect_for_update\b|\btransaction\b|\bconcurren/i },

  // §31 Table Partitioning — queries on partitioned tables
  { section: 31, pattern: /\bpartition\b/i },

  // §32 Views & Materialized Views
  { section: 32, pattern: /\bmateriializ|\bmaterialized\b|\brefresh\s+materialized\b|\bview\b/i },

  // §36 Performance Tuning — work_mem, enable_seqscan, parallel query
  { section: 36, pattern: /\bwork_mem\b|\benable_seqscan\b|\bparallel\b|\bseq_page_cost\b|\brandom_page_cost\b/i },

  // §40 pgvector — vector similarity / semantic search queries
  { section: 40, pattern: /\bvector\b|\bembedding\b|\bsemantic\s+search\b|\bcosine\b|\bl2\b|\binn\b|\bhnsw\b|\bivfflat\b|<->|<#>|<=>/i },
];

export function selectQuerySections(ddl: string, accessPatterns: string): ExtractedSection[] {
  const all = getAllSections();
  const cleanDdl = stripComments(ddl);
  const combined = cleanDdl + '\n' + accessPatterns; // scan both sources

  const picked = new Set<number>(QUERY_CORE_SECTIONS);

  // DDL-driven sections (same as schema validation — carry over type/feature context)
  for (const { section, pattern } of CONDITIONAL_SECTIONS) {
    if (pattern.test(cleanDdl)) picked.add(section);
  }

  // Query/pattern-driven sections
  for (const { section, pattern } of QUERY_CONDITIONAL_SECTIONS) {
    if (pattern.test(combined)) picked.add(section);
  }

  const result: ExtractedSection[] = [];
  for (const num of [...picked].sort((a, b) => a - b)) {
    const s = all.get(num);
    if (s) result.push(s);
  }

  console.log(
    `[knowledge] Query sections selected (${result.length}): ${result.map(s => `§${s.number}`).join(', ')}`,
  );
  return result;
}

export function sectionsAsQueryPromptBlock(ddl: string, accessPatterns: string): string {
  const sections = selectQuerySections(ddl, accessPatterns);
  return sections
    .map(s => `=== §${s.number}. ${s.title} ===\n${s.content}`)
    .join('\n\n');
}

export { ExtractedSection };
