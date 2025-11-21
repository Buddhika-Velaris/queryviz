# Performance Scorecard Framework

QueryViz now includes a comprehensive **Query Performance Scorecard (0-100)** that provides instant, actionable insights into your PostgreSQL query performance.

## Overview

The Performance Scorecard evaluates every query across three critical dimensions and provides a total score out of 100, along with an instant verdict and specific recommendations.

## Scoring Categories

### 1. ⚡ Latency Score (Max 35 Points)
**Measures:** How fast is the query returning data?

| Execution Time | Score | Rating |
|----------------|-------|--------|
| < 50ms | 35 pts | Excellent |
| 50ms - 500ms | 25 pts | Acceptable |
| 500ms - 2s | 12 pts | Needs Review |
| > 2s | 0 pts | Critical |

**Penalty:** If Planning Time > Execution Time, -5 pts is deducted. This indicates query parsing overhead or schema complexity issues.

### 2. 💾 I/O Efficiency Score (Max 35 Points)
**Measures:** Is the query reading from RAM (fast) or Disk (slow)?

**Formula:**
```
Cache Hit Ratio = Shared Hit Blocks / (Shared Hit Blocks + Shared Read Blocks)
```

| Cache Hit Ratio | Score | Rating |
|-----------------|-------|--------|
| > 99% | 35 pts | Mostly RAM (Excellent) |
| 90% - 99% | 25 pts | Acceptable |
| < 90% | 0 pts | Disk Heavy (Critical) |

### 3. 📈 Scalability & Indexing Score (Max 30 Points)
**Measures:** Will this query survive if the table grows by 10x or 100x?

| Condition | Observation | Score |
|-----------|-------------|-------|
| Index Scan | Specific index used, near-zero rows discarded | 30 pts |
| Seq Scan (Tiny Table) | Table < 1,000 rows | 24 pts |
| Seq Scan (Large Table) | Table > 1,000 rows OR High Rows Removed | 0 pts |
| High Filtering | Rows Removed > 50% of total rows read | -12 pts |

**Key Insight:** Sequential scans are acceptable on tiny tables but catastrophic on large datasets.

## Verdict System

Based on the total score, QueryViz provides an instant verdict:

- **80-100:** 🌟 Excellent - Production Ready
- **60-79:** ✅ Good - Minor Optimizations Possible
- **40-59:** ⚠️ Needs Optimization - Performance Issues Present
- **0-39:** 🚨 Critical - Significant Performance Problems

## Example Analysis

### Query: Simple SELECT with WHERE clause

```sql
SELECT * FROM canvas_metadata WHERE canvas_id = 365;
```

**Execution Plan Metrics:**
- Execution Time: 13.527ms
- Planning Time: 10.06ms
- Cache Hit Ratio: 36%
- Node Type: Sequential Scan
- Rows: 133 scanned, 132 removed by filter

**Performance Scorecard:**

| Category | Score | Details |
|----------|-------|---------|
| ⚡ Latency | 30/35 | Execution 13.5ms (excellent), but planning overhead (-5 pts) |
| 💾 I/O Efficiency | 0/35 | Cache hit ratio 36% - disk heavy |
| 📈 Scalability | 12/30 | Seq scan with 99% filtering - missing index |
| **Total** | **42/100** | **⚠️ Needs Optimization** |

**Verdict:** Your query is **Fast but Fragile**.

**Why it feels fast:** The table is tiny (only ~133 rows). Even a "bad" plan runs instantly.

**Why it scores low:**
- Missing index on `canvas_id` causes sequential scan
- 99% of rows are discarded after scanning (wasteful)
- Low cache hit ratio (cold query)
- If the table grows to 1M rows, this query becomes 10,000x slower

**Recommendations:**
1. Add index: `CREATE INDEX idx_canvas_metadata_canvas_id ON canvas_metadata(canvas_id);`
2. Run ANALYZE to warm statistics
3. Monitor query after table growth

## Integration

### Backend
The scorecard is automatically calculated in `backend/src/utils/planParser.ts` and included in the metrics response:

```typescript
const metrics = extractPlanMetrics(planJson);
// metrics.performanceScore contains the full scorecard
```

### Frontend
Display the scorecard using the `PerformanceScorecard` component:

```tsx
import PerformanceScorecard from '../components/PerformanceScorecard';

<PerformanceScorecard 
  scorecard={metrics.performanceScore} 
  label="Performance Score"
/>
```

### LLM Analysis
The scorecard is passed to the OpenAI GPT-4o model as context, allowing it to provide more accurate, data-driven recommendations aligned with the scoring framework.

## Benefits

1. **Instant Clarity:** No need to interpret complex metrics - get a single score
2. **Actionable Insights:** Specific recommendations based on what's lowering your score
3. **Proactive Optimization:** Identify "fast but fragile" queries before they become problems
4. **Objective Comparison:** Compare plans with quantitative scores, not just execution time
5. **Educational:** Learn what makes queries fast or slow through the scoring breakdown

## Best Practices

- **Score 80+:** Safe for production, but monitor growth
- **Score 60-79:** Optimize during development, acceptable for non-critical paths
- **Score 40-59:** Must optimize before production
- **Score < 40:** Do not deploy - serious performance issues

## Technical Details

The scoring algorithm considers:
- Execution and planning time metrics
- Buffer cache statistics (shared blocks hit/read)
- Node types and access patterns (index vs sequential scans)
- Filtering efficiency (rows removed vs returned)
- Table size and growth implications

All scores are calculated deterministically from the EXPLAIN (ANALYZE, BUFFERS) output, ensuring consistency and reproducibility.
