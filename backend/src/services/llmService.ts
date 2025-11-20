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

const MODEL = 'gpt-5.1';

export async function analyzeSinglePlan(planJson: any): Promise<string> {
  const systemPrompt = `You are a world-class PostgreSQL tuning expert. Analyze the provided EXPLAIN (ANALYZE, BUFFERS) JSON output.

Your analysis should include:
1. **Efficiency Score (1-10)**: Rate the query's overall performance
2. **Top 3 Bottlenecks**: Identify the most time-consuming operations
3. **Optimization Recommendations**: Provide 3 concrete, actionable suggestions (SQL rewrites, indexes, configuration changes)

Be specific and reference actual node types, table names, and metrics from the plan.`;

  const userPrompt = `Analyze this PostgreSQL query execution plan:\n\n${JSON.stringify(planJson, null, 2)}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 5100,
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
  const systemPrompt = `You are a senior database architect specializing in PostgreSQL performance tuning. Compare two query execution plans and determine which is superior.

Focus on:
1. **Overall Winner**: Which plan is better and why?
2. **Key Differences**: Highlight critical differences (scan types, join methods, index usage)
3. **Performance Impact**: Quantify the difference in execution time, rows processed, and I/O operations
4. **Architectural Reasoning**: Explain why one approach outperforms the other

Use the actual metrics and plan structures provided.`;

  const userPrompt = `Compare these two PostgreSQL query execution plans:

**Plan A Metrics:**
- Execution Time: ${metricsA.executionTime}ms
- Total Cost: ${metricsA.totalCost}
- Total Rows: ${metricsA.totalRows}
- Shared Blocks Hit: ${metricsA.sharedBlocksHit}
- Shared Blocks Read: ${metricsA.sharedBlocksRead}

**Plan A JSON:**
${JSON.stringify(planA, null, 2)}

**Plan B Metrics:**
- Execution Time: ${metricsB.executionTime}ms
- Total Cost: ${metricsB.totalCost}
- Total Rows: ${metricsB.totalRows}
- Shared Blocks Hit: ${metricsB.sharedBlocksHit}
- Shared Blocks Read: ${metricsB.sharedBlocksRead}

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
      temperature: 0.7,
      max_completion_tokens: 2000,
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
      temperature: 0.5,
      max_completion_tokens: 5100,
    });

    return response.choices[0]?.message?.content || 'No explanation available';
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`Node explanation failed: ${error.message}`);
  }
}
