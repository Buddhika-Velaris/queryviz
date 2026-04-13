import OpenAI from 'openai';

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
