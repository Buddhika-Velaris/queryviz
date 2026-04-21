import { Router, Request, Response } from 'express';
import { validateSchemaSQL, generateOptimalQueries } from '../services/llmService.js';
import { getOrCompute, hashKey } from '../services/cache.js';

const router = Router();

const MAX_SQL_SIZE = 100_000; // 100 KB — generous for multi-table DDL

const MAX_CONTEXT_SIZE = 2_000; // 2 KB — enough for a paragraph

interface ValidateSchemaRequest {
  sql: string;
  userContext?: string;
}

router.post('/schema', async (req: Request<{}, {}, ValidateSchemaRequest>, res: Response) => {
  const startTime = Date.now();

  try {
    const { sql, userContext } = req.body;

    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({
        error: 'sql is required',
        details: 'Provide a PostgreSQL DDL string (CREATE TABLE, ALTER TABLE, etc.)',
      });
    }

    const trimmed = sql.trim();

    if (trimmed.length === 0) {
      return res.status(400).json({ error: 'sql must not be empty' });
    }

    if (trimmed.length > MAX_SQL_SIZE) {
      return res.status(413).json({
        error: 'SQL exceeds maximum size of 100 KB',
        details: 'Split your schema into smaller chunks',
      });
    }

    const context = typeof userContext === 'string'
      ? userContext.trim().slice(0, MAX_CONTEXT_SIZE)
      : undefined;

    // Context changes the analysis — don't serve a context-free cached result.
    // Bump the namespace suffix when the prompt/response shape changes to invalidate stale entries.
    const PROMPT_VERSION = 'v2';
    const cacheKeySuffix = context ? `${trimmed}::ctx::${context}` : trimmed;
    const key = hashKey(`schema-validate-${PROMPT_VERSION}`, cacheKeySuffix);
    const { value, cached } = await getOrCompute(
      `schema-validate-${PROMPT_VERSION}`,
      key,
      () => validateSchemaSQL(trimmed, context),
    );

    const processingTime = Date.now() - startTime;
    console.log(`[API] Schema validated in ${processingTime}ms (cached: ${cached})`);

    res.json({
      result: value,
      cached,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Schema validation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to validate schema',
      details: error.code || 'internal_error',
    });
  }
});

// ─── Query generation endpoint ───────────────────────────────────────────────

const MAX_PATTERNS_SIZE = 3_000;    // 3 KB — enough for 10+ detailed patterns
const MAX_RELATED_DDL_SIZE = 100_000; // same limit as primary DDL

interface QueryGenRequest {
  primaryDdl: string;
  accessPatterns: string;
  relatedDdl?: string;
}

router.post('/queries', async (req: Request<{}, {}, QueryGenRequest>, res: Response) => {
  const startTime = Date.now();
  try {
    const { primaryDdl, accessPatterns, relatedDdl } = req.body;

    if (!primaryDdl || typeof primaryDdl !== 'string') {
      return res.status(400).json({ error: 'primaryDdl is required' });
    }
    if (!accessPatterns || typeof accessPatterns !== 'string') {
      return res.status(400).json({ error: 'accessPatterns is required' });
    }

    const trimmedDdl = primaryDdl.trim();
    const trimmedPatterns = accessPatterns.trim().slice(0, MAX_PATTERNS_SIZE);
    const trimmedRelated = typeof relatedDdl === 'string'
      ? relatedDdl.trim().slice(0, MAX_RELATED_DDL_SIZE)
      : undefined;

    if (!trimmedDdl) return res.status(400).json({ error: 'primaryDdl must not be empty' });
    if (!trimmedPatterns) return res.status(400).json({ error: 'accessPatterns must not be empty' });
    if (trimmedDdl.length > MAX_SQL_SIZE) {
      return res.status(413).json({ error: 'DDL exceeds maximum size of 100 KB' });
    }

    const PROMPT_VERSION = 'v1';
    const key = hashKey(`query-gen-${PROMPT_VERSION}`, trimmedDdl, trimmedPatterns, trimmedRelated ?? '');
    const { value, cached } = await getOrCompute(
      `query-gen-${PROMPT_VERSION}`,
      key,
      () => generateOptimalQueries(trimmedDdl, trimmedPatterns, trimmedRelated),
    );

    const processingTime = Date.now() - startTime;
    console.log(`[API] Query generation done in ${processingTime}ms (cached: ${cached})`);

    res.json({
      result: value,
      cached,
      metadata: { processingTime, timestamp: new Date().toISOString() },
    });
  } catch (error: any) {
    console.error('Query generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate queries',
      details: error.code || 'internal_error',
    });
  }
});

export default router;
