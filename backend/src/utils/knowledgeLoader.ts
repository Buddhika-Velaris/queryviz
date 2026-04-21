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

export { ExtractedSection };
