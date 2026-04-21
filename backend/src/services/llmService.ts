import OpenAI from 'openai';
import { sectionsAsPromptBlock, sectionsAsQueryPromptBlock } from '../utils/knowledgeLoader.js';

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiInstance;
}

const MODEL = 'gpt-5.4';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Finding {
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  sql?: string;
}

export interface SingleAnalysis {
  efficiencyScore: number;
  scoreLabel: string;
  executionSummary: string;
  findings: Finding[];
  recommendations: Recommendation[];
  summary: string;
}

export interface KeyDifference {
  aspect: string;
  planA: string;
  planB: string;
  winner: 'A' | 'B' | 'tie';
}

export interface ComparisonAnalysis {
  winner: 'A' | 'B' | 'tie';
  winnerMargin: 'significant' | 'marginal' | 'equal';
  winnerSummary: string;
  keyDifferences: KeyDifference[];
  findings: Finding[];
  summary: string;
}

// ─── JSON extraction helper ───────────────────────────────────────────────────

function tryParse(raw: string): any | null {
  try { return JSON.parse(raw); } catch { return null; }
}

// Best-effort repair for truncated JSON — close open strings, arrays, and objects
function repairTruncatedJSON(raw: string): string {
  let s = raw.trim();

  // Strip trailing garbage after last structural character
  const lastBrace = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (lastBrace < s.length - 1 && lastBrace !== -1) {
    // Keep everything up to lastBrace then attempt repair below
  }

  // Walk the string tracking string/escape state and bracket depth
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' && stack[stack.length - 1] === '{') stack.pop();
    else if (c === ']' && stack[stack.length - 1] === '[') stack.pop();
  }

  if (inString) s += '"';
  // Strip trailing comma before closing
  s = s.replace(/,\s*$/, '');
  while (stack.length) {
    const open = stack.pop();
    s += open === '{' ? '}' : ']';
  }
  return s;
}

function extractJSON(text: string): any {
  const direct = tryParse(text);
  if (direct !== null) return direct;

  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    const parsed = tryParse(codeBlock[1]);
    if (parsed !== null) return parsed;
  }

  const start = text.indexOf('{');
  if (start !== -1) {
    const end = text.lastIndexOf('}');
    if (end > start) {
      const parsed = tryParse(text.substring(start, end + 1));
      if (parsed !== null) return parsed;
    }

    // Truncation repair — take from first { and close open structures
    const slice = text.substring(start);
    const repaired = repairTruncatedJSON(slice);
    const parsed = tryParse(repaired);
    if (parsed !== null) {
      console.warn('[llm] Recovered JSON via truncation repair');
      return parsed;
    }
  }

  throw new Error('Could not extract valid JSON from LLM response');
}

// ─── Single plan analysis ─────────────────────────────────────────────────────

export async function analyzeSinglePlan(planJson: any): Promise<SingleAnalysis> {
  const systemPrompt = `You are a world-class PostgreSQL performance engineer. Analyze the EXPLAIN (ANALYZE, BUFFERS) JSON and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Return exactly this structure:
{
  "efficiencyScore": <integer 1-10>,
  "scoreLabel": <"Excellent"|"Good"|"Fair"|"Poor"|"Critical">,
  "executionSummary": "<2-3 sentences: what the query does, total time, the primary bottleneck>",
  "findings": [
    {
      "severity": <"critical"|"warning"|"info"|"success">,
      "title": "<max 8 words>",
      "description": "<1-3 sentences with specific numbers from the plan>"
    }
  ],
  "recommendations": [
    {
      "priority": <"high"|"medium"|"low">,
      "title": "<max 8 words>",
      "description": "<2-4 sentences: what to do, why it helps, and the expected impact>",
      "sql": "<ready-to-run SQL if applicable — indexes, rewrites, config changes — otherwise omit>"
    }
  ],
  "summary": "<1-2 sentences: the single most impactful change to make>"
}

Rules:
- findings: cover ALL significant observations — missing indexes, row estimate errors, join strategy issues, disk spills, buffer usage, filter placement, partition pruning, etc. Include "success" for genuine positives. Order by severity descending.
- recommendations: include EVERY actionable improvement that applies — do not cap the list. Cover indexes (B-tree, partial, covering, composite), query rewrites, statistics updates (ANALYZE), join hints, work_mem tuning, parallel query settings, partitioning, materialized CTEs, and any other relevant PostgreSQL optimizations. For each recommendation provide the exact ready-to-run SQL where applicable. Order by priority (high first).
- Be specific: use actual table names, column names, row counts, timings, and block counts from the plan.
- scoreLabel: 1-2→Critical, 3-4→Poor, 5-6→Fair, 7-8→Good, 9-10→Excellent`;

  const userPrompt = `Analyze this PostgreSQL query execution plan:\n\n${JSON.stringify(planJson, null, 2)}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 16000,
    });

    const content = response.choices[0]?.message?.content || '';
    return extractJSON(content) as SingleAnalysis;
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`LLM analysis failed: ${error.message}`);
  }
}

// ─── Compare two plans ────────────────────────────────────────────────────────

export async function comparePlans(
  planA: any,
  planB: any,
  metricsA: any,
  metricsB: any,
): Promise<ComparisonAnalysis> {
  const systemPrompt = `You are a senior database architect specializing in PostgreSQL performance. Compare two query execution plans and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Return exactly this structure:
{
  "winner": <"A"|"B"|"tie">,
  "winnerMargin": <"significant"|"marginal"|"equal">,
  "winnerSummary": "<1-2 sentences: which plan wins and the primary reason>",
  "keyDifferences": [
    {
      "aspect": "<aspect name, e.g. Join Strategy, Index Usage, Memory>",
      "planA": "<Plan A's approach in one sentence>",
      "planB": "<Plan B's approach in one sentence>",
      "winner": <"A"|"B"|"tie">
    }
  ],
  "findings": [
    {
      "severity": <"critical"|"warning"|"info"|"success">,
      "title": "<max 8 words>",
      "description": "<1-3 sentences with specific numbers>"
    }
  ],
  "summary": "<1-2 sentences: the most important architectural takeaway>"
}

Rules:
- keyDifferences: cover ALL meaningful differences — join strategy, scan type, index usage, sort method, parallelism, memory usage, row estimates, CTE materialization, partition pruning, etc. Do not cap the list.
- findings: cover ALL significant observations across both plans — what each plan does well, what each does poorly, and any shared problems. Include "success" items for genuine improvements. Order by severity descending.
- Be precise: use actual timings, row counts, block counts, and percentages from both plans.`;

  const userPrompt = `Compare these two PostgreSQL execution plans:

Plan A — ${metricsA.executionTime}ms, cost ${metricsA.totalCost}, ${metricsA.totalRows} rows, ${metricsA.sharedBlocksHit} buffer hits:
${JSON.stringify(planA, null, 2)}

Plan B — ${metricsB.executionTime}ms, cost ${metricsB.totalCost}, ${metricsB.totalRows} rows, ${metricsB.sharedBlocksHit} buffer hits:
${JSON.stringify(planB, null, 2)}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 16000,
    });

    const content = response.choices[0]?.message?.content || '';
    return extractJSON(content) as ComparisonAnalysis;
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`LLM comparison failed: ${error.message}`);
  }
}

// ─── Schema SQL validation ────────────────────────────────────────────────────

export interface SchemaFinding {
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  knowledgeRef?: string; // e.g. "§7 Numeric & ID Types"
}

export interface SchemaRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  // No per-recommendation sql — the full corrected schema is in correctedSchema
}

export interface SuggestedReading {
  sectionRef: string;   // e.g. "§7"
  number: number;       // e.g. 7
  title: string;        // e.g. "Numeric & ID Types"
  reason: string;       // one sentence: why this section is relevant
}

export interface SchemaValidationResult {
  overallScore: number;
  scoreLabel: string;
  designSummary: string;
  findings: SchemaFinding[];
  recommendations: SchemaRecommendation[];
  correctedSchema: string;       // full DDL rewrite applying all fixes
  suggestedReadings: SuggestedReading[];
  summary: string;
}

export async function validateSchemaSQL(sql: string, userContext?: string): Promise<SchemaValidationResult> {
  const knowledgeBlock = sectionsAsPromptBlock(sql);

  const systemPrompt = `You are a world-class PostgreSQL architect. Review the provided SQL DDL schema and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Below are the authoritative PostgreSQL best-practice reference sections you MUST validate against:

${knowledgeBlock}

Using only the above reference material, analyse the submitted DDL and return exactly this JSON structure.
IMPORTANT — emit keys in EXACTLY this order. correctedSchema and suggestedReadings come BEFORE the long findings/recommendations arrays so they are never dropped under any output budget.

{
  "overallScore": <integer 1-10>,
  "scoreLabel": <"Excellent"|"Good"|"Fair"|"Poor"|"Critical">,
  "designSummary": "<2-3 sentences: what the schema does, overall quality, and the primary issue>",
  "summary": "<1-2 sentences: the single most impactful change to make>",
  "correctedSchema": "<MANDATORY. The user's FULL DDL rewritten with every issue fixed — preserve comments, formatting style, and all original objects. This is a drop-in replacement. Never empty, never omitted. If the schema is already perfect, return it verbatim.>",
  "suggestedReadings": [
    {
      "sectionRef": "<e.g. §7>",
      "number": <integer section number>,
      "title": "<exact section title from the reference material>",
      "reason": "<one sentence: why this section is relevant to the submitted schema>"
    }
  ],
  "findings": [
    {
      "severity": <"critical"|"warning"|"info"|"success">,
      "title": "<max 8 words>",
      "description": "<1-3 sentences referencing the specific column/constraint/table>",
      "knowledgeRef": "<e.g. §7 Numeric & ID Types — always include when a section applies>"
    }
  ],
  "recommendations": [
    {
      "priority": <"high"|"medium"|"low">,
      "title": "<max 8 words>",
      "description": "<2-4 sentences: exact problem, why it matters, what to change — no SQL here>"
    }
  ]
}

Rules:
- Scoring: 1-2→Critical, 3-4→Poor, 5-6→Fair, 7-8→Good, 9-10→Excellent
- Order findings by severity descending (critical first)
- Order recommendations by priority descending (high first)
- correctedSchema is MANDATORY and must be complete runnable SQL — never truncate, never empty, never null
- suggestedReadings: MANDATORY, 2–5 genuinely relevant sections
- Be specific: reference actual table names, column names, and constraint names from the SQL

CONTEXT-AWARE INTEGER TYPE JUDGEMENT (override the blanket BIGINT rule when appropriate):
The default guidance (§7, §8) recommends BIGINT GENERATED ALWAYS AS IDENTITY for all PKs.
However, apply graduated judgement based on the apparent table purpose. Infer purpose from:
  - Table name (e.g. *_config, *_type, *_category, lookup_*, ref_* → lookup; *_v2, orders, events, logs, audit, history → transactional)
  - Column shape (presence of CHECK-constrained category columns, display_order, is_default, is_system → lookup)
  - Developer-provided context (read it — if they say "10 rows max" or "tenant lookup", trust it)

  TRANSACTIONAL / HIGH-GROWTH TABLES (orders, events, user actions, audit logs, task_v2):
    → Flag INTEGER/SERIAL PKs as CRITICAL.
    → Flag INTEGER FK columns that reference a BIGINT PK as CRITICAL — type mismatch forces planner casts.

  CONFIGURATION / LOOKUP TABLES (status_config, role_types, categories, settings — bounded to dozens/hundreds of rows):
    → INTEGER GENERATED ALWAYS AS IDENTITY is CORRECT — do NOT recommend BIGINT.
    → Keep the FK column on any large child table at INTEGER too (type-consistent with the PK). Do NOT recommend widening both sides to BIGINT; that wastes 4 bytes × billions of child rows with zero benefit at this scale.
    → Do NOT add secondary indexes on low-cardinality columns (category, display_order, is_enabled) for tables with <1000 rows — a seq scan is faster. Flag existing ones as "info: consider removing".
    → Inline CHECK (col IN (...)) constraints on small lookup tables are appropriate — do NOT push ENUM or sub-lookup-table migrations unless the user explicitly asks.

  FK COLUMNS ON LARGE CHILD TABLES referencing lookup PKs:
    → Type must match the lookup PK exactly. If lookup is INTEGER, child FK stays INTEGER. This is the deliberate, correct choice.

  SOFT-DELETE PATTERN (applies at any scale):
    → \`archived SMALLINT DEFAULT 0\` or \`deleted BOOLEAN\` → recommend \`archived_at TIMESTAMPTZ NULL\` / \`deleted_at TIMESTAMPTZ NULL\` (§43). Carries when-deleted for free and \`WHERE archived_at IS NULL\` reads cleaner.

  TIMESTAMP NAMING:
    → \`created\` / \`modified\` → recommend \`created_at\` / \`modified_at\` for convention.
    → A \`modified_at\` column with no BEFORE UPDATE trigger or application-level update is a bug — flag it.`;

  const userPrompt = userContext
    ? `Additional context from the developer:\n${userContext}\n\nValidate this PostgreSQL DDL schema:\n\n${sql}`
    : `Validate this PostgreSQL DDL schema:\n\n${sql}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_completion_tokens: 16000,
      response_format: { type: 'json_object' },
      // Stable prefix (system prompt + knowledge block) is auto-cached by OpenAI
      // when >=1024 tokens. `user` routes identical prefixes to the same cache shard.
      user: 'schema-validator-v1',
    });

    const choice = response.choices[0];
    const content = choice?.message?.content || '';
    const finish = choice?.finish_reason;

    console.log('[llm] schema validate:', {
      finish_reason: finish,
      usage: response.usage,
      content_length: content.length,
    });

    if (!content) {
      throw new Error(`LLM returned empty content (finish_reason: ${finish})`);
    }
    if (finish === 'length') {
      console.warn('[llm] Response hit token limit — attempting JSON repair');
    }

    try {
      return extractJSON(content) as SchemaValidationResult;
    } catch (parseErr) {
      console.error('[llm] Raw content that failed to parse (first 2000 chars):');
      console.error(content.slice(0, 2000));
      console.error('[llm] ...last 500 chars:');
      console.error(content.slice(-500));
      throw parseErr;
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`Schema validation failed: ${error.message}`);
  }
}

// ─── Explain a single node ────────────────────────────────────────────────────

export async function explainNode(nodeType: string): Promise<string> {
  const systemPrompt = `You are a PostgreSQL expert. Explain database execution plan node types concisely.
Respond in plain text (no JSON, no markdown headers). Under 60 words. Cover: what it does, when PostgreSQL chooses it, and one performance consideration.`;

  const userPrompt = `Explain the PostgreSQL execution plan node type: "${nodeType}"`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_completion_tokens: 16000,
    });

    return response.choices[0]?.message?.content || 'No explanation available';
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`Node explanation failed: ${error.message}`);
  }
}

// ─── Query generation ─────────────────────────────────────────────────────────

export interface OptimizedQuery {
  description: string;
  sql: string;
  explanation: string;
}

export interface QueryIndex {
  sql: string;
  reason: string;
  impact: 'critical' | 'recommended' | 'optional';
}

export interface QueryGenerationResult {
  queries: OptimizedQuery[];
  indexes: QueryIndex[];
  notes: string;
}

export async function generateOptimalQueries(
  primaryDdl: string,
  accessPatterns: string,
  relatedDdl?: string,
): Promise<QueryGenerationResult> {
  const combinedDdl = relatedDdl?.trim()
    ? `${primaryDdl}\n\n-- Related tables:\n${relatedDdl}`
    : primaryDdl;

  const knowledgeBlock = sectionsAsQueryPromptBlock(combinedDdl, accessPatterns);

  const systemPrompt = `You are a world-class PostgreSQL performance engineer. Given one or more DDL schemas and a list of access patterns, produce the most optimal PostgreSQL queries and the exact indexes they require. Return ONLY a valid JSON object — no markdown, no prose outside JSON.

Below are the authoritative PostgreSQL best-practice reference sections you MUST apply:

${knowledgeBlock}

Return exactly this structure:
{
  "queries": [
    {
      "description": "<one sentence: what this query retrieves or achieves>",
      "sql": "<complete, ready-to-run SQL — schema-qualified names, meaningful aliases, CTEs or subqueries where they improve performance>",
      "explanation": "<2-4 sentences: why this form is optimal — index usage, join strategy, filter placement, row estimate, and any rewrites applied>"
    }
  ],
  "indexes": [
    {
      "sql": "<ready-to-run CREATE INDEX CONCURRENTLY statement with a descriptive name>",
      "reason": "<one sentence: which query or pattern this index serves and why>",
      "impact": "critical"|"recommended"|"optional"
    }
  ],
  "notes": "<1-2 sentences: caveats, assumptions made, or follow-up considerations>"
}

Rules:
- One optimised query per access pattern. If a pattern has natural variants (paginated vs full, with/without a filter) produce both and label them.
- Filter placement: push WHERE predicates as early as possible — inside CTEs, subquery FROM clauses, and JOIN ON conditions rather than an outer WHERE.
- Composite index column order: equality predicates first, then range predicates, then ORDER BY columns.
- Use CREATE INDEX CONCURRENTLY so indexes can be built on live tables.
- Use partial indexes (WHERE clause) when the query targets a selective subset of rows.
- Add INCLUDE columns for hot covering-index paths.
- impact levels — critical: missing this causes a seq scan on a large table; recommended: significant gain; optional: minor gain.
- Never invent columns, tables, or types not present in the provided DDL.
- If a JOIN requires a table not in the DDL, produce the best possible query and mention the missing table in notes.`;

  const userPrompt = relatedDdl?.trim()
    ? `Primary schema:\n${primaryDdl}\n\nRelated table DDLs (for JOINs):\n${relatedDdl}\n\nAccess patterns:\n${accessPatterns}`
    : `Schema:\n${primaryDdl}\n\nAccess patterns:\n${accessPatterns}`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_completion_tokens: 16000,
    response_format: { type: 'json_object' },
  });

  const choice = response.choices[0];
  const content = choice?.message?.content || '';
  const finish = choice?.finish_reason;

  console.log('[llm] query gen:', {
    finish_reason: finish,
    usage: response.usage,
    content_length: content.length,
  });

  if (!content) throw new Error(`LLM returned empty content (finish_reason: ${finish})`);
  if (finish === 'length') {
    console.warn('[llm] Query gen response hit token limit — attempting JSON repair');
  }

  return extractJSON(content) as QueryGenerationResult;
}
