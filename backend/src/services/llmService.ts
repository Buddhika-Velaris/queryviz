import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

const MODEL = 'gpt-4o';

export async function analyzeSinglePlan(planJson: any, scorecard?: any): Promise<string> {
  const scorecardContext = scorecard ? `

**PERFORMANCE SCORECARD (0-100):**
- Total Score: ${scorecard.totalScore}/100
- Latency: ${scorecard.latencyScore.score}/30 - ${scorecard.latencyScore.details}
- I/O Efficiency: ${scorecard.ioEfficiencyScore.score}/30 - ${scorecard.ioEfficiencyScore.details}
- Scalability: ${scorecard.scalabilityScore.score}/25 - ${scorecard.scalabilityScore.details}
- Accuracy: ${scorecard.accuracyScore.score}/15 - ${scorecard.accuracyScore.details}
- Verdict: ${scorecard.verdict}
` : '';

  const systemPrompt = `You are a world-class PostgreSQL tuning expert. Analyze the provided EXPLAIN (ANALYZE, BUFFERS) JSON output using the Query Performance Scorecard framework.

## Performance Scorecard Framework (0-100):

### 1. Latency Score (Max 30 Points) - Query Speed
- < 50ms: 30 pts (Excellent)
- 50-500ms: 20 pts (Acceptable)
- 500ms-2s: 10 pts (Needs Review)
- > 2s: 0 pts (Critical)
- Planning Time > Execution Time: -5 pts penalty

### 2. I/O Efficiency Score (Max 30 Points) - RAM vs Disk
Cache Hit Ratio = Shared Hit Blocks / (Shared Hit + Shared Read)
- > 99% (RAM): 30 pts
- 90-99%: 20 pts
- < 90% (Disk Heavy): 0 pts

### 3. Scalability Score (Max 25 Points) - Growth Potential
- Index Scan + Low filtering: 25 pts
- Seq Scan on tiny table (< 1000 rows): 20 pts
- Seq Scan on large table: 0 pts
- High row filtering (> 50% removed): -10 pts

### 4. Planner Accuracy Score (Max 15 Points) - Statistics Quality
- Estimate within 10x of actual: 15 pts
- Estimate off by 10-100x: 5 pts
- Estimate off by > 100x: 0 pts

Provide your analysis in this exact format:

# Query Performance Analysis

## 📊 Performance Scorecard: [Score]/100

**Verdict:** [Verdict from scorecard]

### Score Breakdown:
- ⚡ **Latency:** [X]/30 - [Brief explanation]
- 💾 **I/O Efficiency:** [X]/30 - [Brief explanation]
- 📈 **Scalability:** [X]/25 - [Brief explanation]
- 🎯 **Accuracy:** [X]/15 - [Brief explanation]

## 🔍 Detailed Analysis

### Performance Characteristics
[Explain what makes this query fast/slow and whether it's fragile]

### Key Findings
[2-3 bullet points about the most important observations]

## ⚠️ Bottlenecks & Issues

[List specific bottlenecks with node types, table names, and metrics]

## 💡 Optimization Recommendations

[Provide 3-5 actionable recommendations with SQL examples where applicable]

Be specific, reference actual metrics, and explain the reasoning.`;

  const userPrompt = `Analyze this PostgreSQL query execution plan:${scorecardContext}\n\n${JSON.stringify(planJson, null, 2)}`;
console.log('ddfdfd')
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_completion_tokens: 4500,
    });

    return response.choices[0]?.message?.content || 'No analysis available';
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`LLM analysis failed: ${error.message}`);
  }
}

export async function comparePlans(
  planA: any,
  planB: any,
  metricsA: any,
  metricsB: any
): Promise<string> {
  const scorecardA = metricsA.performanceScore;
  const scorecardB = metricsB.performanceScore;

  const systemPrompt = `You are a senior database architect specializing in PostgreSQL performance tuning. Compare two query execution plans using the Performance Scorecard framework and determine which is superior.

Provide your comparison in this format:

# Query Plan Comparison

## 🏆 Winner: Plan [A/B]

**Score:** Plan A: [X]/100 vs Plan B: [Y]/100

### Quick Summary
[1-2 sentences explaining which is better and why]

## 📊 Scorecard Comparison

| Metric | Plan A | Plan B | Winner |
|--------|---------|---------|--------|
| Latency | [X]/30 | [Y]/30 | [A/B] |
| I/O Efficiency | [X]/30 | [Y]/30 | [A/B] |
| Scalability | [X]/25 | [Y]/25 | [A/B] |
| Accuracy | [X]/15 | [Y]/15 | [A/B] |

## 🔍 Key Differences

### Execution Strategy
[Compare scan types, join methods, index usage]

### Performance Impact
[Quantify differences in execution time, I/O, rows processed]

## 💡 Architectural Reasoning

[Explain why one approach outperforms the other]

## 📈 Improvement Recommendations

[If neither plan is optimal, suggest further improvements]`;

  const userPrompt = `Compare these two PostgreSQL query execution plans:

**Plan A Scorecard:**
- Total Score: ${scorecardA?.totalScore || 'N/A'}/100
- Latency: ${scorecardA?.latencyScore.score || 'N/A'}/30
- I/O: ${scorecardA?.ioEfficiencyScore.score || 'N/A'}/30 (Cache: ${scorecardA?.ioEfficiencyScore.cacheHitRatio?.toFixed(1) || 'N/A'}%)
- Scalability: ${scorecardA?.scalabilityScore.score || 'N/A'}/25
- Accuracy: ${scorecardA?.accuracyScore.score || 'N/A'}/15
- Verdict: ${scorecardA?.verdict || 'Unknown'}

**Plan A Metrics:**
- Execution Time: ${metricsA.executionTime}ms
- Total Cost: ${metricsA.totalCost}
- Total Rows: ${metricsA.totalRows}

**Plan A JSON:**
${JSON.stringify(planA, null, 2)}

---

**Plan B Scorecard:**
- Total Score: ${scorecardB?.totalScore || 'N/A'}/100
- Latency: ${scorecardB?.latencyScore.score || 'N/A'}/30
- I/O: ${scorecardB?.ioEfficiencyScore.score || 'N/A'}/30 (Cache: ${scorecardB?.ioEfficiencyScore.cacheHitRatio?.toFixed(1) || 'N/A'}%)
- Scalability: ${scorecardB?.scalabilityScore.score || 'N/A'}/25
- Accuracy: ${scorecardB?.accuracyScore.score || 'N/A'}/15
- Verdict: ${scorecardB?.verdict || 'Unknown'}

**Plan B Metrics:**
- Execution Time: ${metricsB.executionTime}ms
- Total Cost: ${metricsB.totalCost}
- Total Rows: ${metricsB.totalRows}

**Plan B JSON:**
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
      max_completion_tokens: 3000,
    });

    return response.choices[0]?.message?.content || 'No comparison available';
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`LLM comparison failed: ${error.message}`);
  }
}

export async function explainNode(nodeType: string): Promise<string> {
  const systemPrompt = `You are a PostgreSQL terminology expert. Explain database execution plan node types in simple, accessible language.

Your explanation should:
1. Be concise (under 50 words)
2. Explain what the node does
3. State its primary use case
4. Be understandable to non-experts`;

  const userPrompt = `Explain the PostgreSQL execution plan node type: "${nodeType}"`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 200,
    });

    return response.choices[0]?.message?.content || 'No explanation available';
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`Node explanation failed: ${error.message}`);
  }
}
