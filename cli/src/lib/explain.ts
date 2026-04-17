import pg from 'pg';

export interface ExplainOptions {
  databaseUrl: string;
  sql: string;
  timeoutMs?: number;
  debug?: boolean;
  verbose?: boolean;
}

export type PlanJson = unknown;

const DEFAULT_TIMEOUT_MS = 60_000;

export async function runExplain({
  databaseUrl,
  sql,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  debug = false,
  verbose = false,
}: ExplainOptions): Promise<PlanJson> {
  const innerSql = sanitizeWhitespace(stripLeadingExplain(sql));
  assertSingleStatement(innerSql);

  const client = new pg.Client({
    connectionString: databaseUrl,
    statement_timeout: timeoutMs,
    query_timeout: timeoutMs,
  });

  await client.connect();

  try {
    await client.query('BEGIN');
    try {
      await client.query(`SET LOCAL statement_timeout = ${Number(timeoutMs)}`);

      const explainOpts = [
        'ANALYZE',
        'BUFFERS',
        verbose ? 'VERBOSE' : null,
        'FORMAT JSON',
      ]
        .filter(Boolean)
        .join(', ');
      const explainSql = `EXPLAIN (${explainOpts}) ${innerSql}`;
      if (debug) {
        process.stderr.write('\n--- SQL sent to Postgres ---\n');
        process.stderr.write(explainSql);
        process.stderr.write('\n----------------------------\n');
      }
      try {
        const result = await client.query(explainSql);
        const rows = result.rows as Array<Record<string, unknown>>;
        if (!rows.length) {
          throw new Error('EXPLAIN returned no rows');
        }
        return normalizePlanCell(rows[0]['QUERY PLAN']);
      } catch (err) {
        throw enrichPgError(err, sql);
      }
    } finally {
      await client.query('ROLLBACK').catch(() => {});
    }
  } finally {
    await client.end().catch(() => {});
  }
}

function normalizePlanCell(cell: unknown): PlanJson {
  if (typeof cell === 'string') {
    return JSON.parse(cell);
  }
  return cell;
}

function enrichPgError(err: unknown, sql: string): Error {
  if (!(err instanceof Error)) return new Error(String(err));
  const position = (err as { position?: string | number }).position;
  const hint = (err as { hint?: string }).hint;

  const snippet = sqlSnippet(sql, position);
  const parts = [err.message];
  if (hint) parts.push(`hint: ${hint}`);
  if (snippet) parts.push(`near: ${snippet}`);
  if (/syntax error/i.test(err.message) && /["]/.test(sql.slice(0, 400))) {
    parts.push(
      'tip: SQL contains double-quoted identifiers — use `--file query.sql` instead of inline quoting.',
    );
  }
  const enriched = new Error(parts.join('\n  '));
  enriched.stack = err.stack;
  return enriched;
}

function sqlSnippet(sql: string, position: string | number | undefined): string {
  if (position === undefined) return '';
  const pos = Number(position);
  if (!Number.isFinite(pos) || pos <= 0) return '';
  const start = Math.max(0, pos - 40);
  const end = Math.min(sql.length, pos + 40);
  const slice = sql.slice(start, end).replace(/\s+/g, ' ').trim();
  return `…${slice}…`;
}

function assertSingleStatement(sql: string): void {
  const trimmed = sql.trim().replace(/;+\s*$/g, '');
  if (trimmed.includes(';')) {
    throw new Error(
      'Multiple statements are not allowed. Pass a single SELECT/UPDATE/INSERT/DELETE.',
    );
  }
  if (!trimmed) {
    throw new Error('SQL is empty.');
  }
}

// Accept SQL that already starts with EXPLAIN (optional options block) —
// common when pasted from DBeaver/pgAdmin — and return just the underlying
// statement. We re-wrap with our own EXPLAIN options so the plan JSON shape
// stays consistent.
// Replace common invisible Unicode whitespace with ASCII spaces so Postgres
// doesn't choke on NBSP (U+00A0), zero-width space, narrow-no-break-space,
// etc. that editors sometimes paste in.
function sanitizeWhitespace(sql: string): string {
  return sql
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u202F/g, ' ')
    .replace(/\r\n?/g, '\n');
}

function stripLeadingExplain(sql: string): string {
  let s = sql.replace(/^\uFEFF/, '').trim();
  s = s.replace(/;+\s*$/g, '');
  const match = s.match(/^explain\s*(\([^)]*\))?\s+/i);
  if (match) {
    s = s.slice(match[0].length).trim();
  }
  return s;
}
