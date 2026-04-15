import { Router, Request, Response } from 'express';
import { validateSchemaSQL } from '../services/llmService.js';
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

    // Context changes the analysis — don't serve a context-free cached result
    const cacheKeySuffix = context ? `${trimmed}::ctx::${context}` : trimmed;
    const key = hashKey('schema-validate', cacheKeySuffix);
    const { value, cached } = await getOrCompute(
      'schema-validate',
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

export default router;
