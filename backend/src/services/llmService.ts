import OpenAI from 'openai';
import { sectionsAsPromptBlock } from '../utils/knowledgeLoader.js';

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

function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {}

  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]); } catch {}
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.substring(start, end + 1)); } catch {}
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

Using only the above reference material, analyse the submitted DDL and return exactly this JSON structure:
{
  "overallScore": <integer 1-10>,
  "scoreLabel": <"Excellent"|"Good"|"Fair"|"Poor"|"Critical">,
  "designSummary": "<2-3 sentences: what the schema does, overall quality, and the primary issue>",
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
  ],
  "correctedSchema": "<the user's FULL DDL rewritten with every issue fixed — preserve comments, formatting style, and all original objects; this is a drop-in replacement for the submitted SQL>",
  "suggestedReadings": [
    {
      "sectionRef": "<e.g. §7>",
      "number": <integer section number>,
      "title": "<exact section title from the reference material>",
      "reason": "<one sentence: why this section is relevant to the submitted schema>"
    }
  ],
  "summary": "<1-2 sentences: the single most impactful change to make>"
}

Rules:
- Scoring: 1-2→Critical, 3-4→Poor, 5-6→Fair, 7-8→Good, 9-10→Excellent
- Order findings by severity descending (critical first)
- Order recommendations by priority descending (high first)
- correctedSchema must be complete runnable SQL — never truncate it
- suggestedReadings: only include sections that are genuinely relevant (2–5 items max)
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
    → \`archived SMALLINT DEFAULT 0\` or \`deleted BOOLEAN\` → recommend \`archived_at TIMESTAMPTZ NULL\` / \`deleted_at TIMESTAMPTZ NULL\` (§42). Carries when-deleted for free and \`WHERE archived_at IS NULL\` reads cleaner.

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
      // Stable prefix (system prompt + knowledge block) is auto-cached by OpenAI
      // when >=1024 tokens. `user` routes identical prefixes to the same cache shard.
      user: 'schema-validator-v1',
    });

    const content = response.choices[0]?.message?.content || '';
    return extractJSON(content) as SchemaValidationResult;
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
