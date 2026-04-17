import kleur from 'kleur';
import ora from 'ora';
import { ApiError, comparePlans } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { runExplain } from '../lib/explain.js';
import { readPlanFile, readSqlFromFileOrStdin } from '../lib/io.js';
import { renderComparison } from '../lib/render.js';

export interface CompareOptions {
  a: string;
  b: string;
  db?: string;
  apiUrl?: string;
  fromFiles?: boolean;
  timeout?: string;
}

export async function compareCommand(options: CompareOptions): Promise<void> {
  const config = loadConfig({
    apiUrl: options.apiUrl,
    databaseUrl: options.db,
  });

  const timeoutMs = options.timeout
    ? Math.max(1000, Number(options.timeout) * 1000)
    : undefined;

  let planA: unknown;
  let planB: unknown;

  if (options.fromFiles) {
    [planA, planB] = await Promise.all([
      readPlanFile(options.a),
      readPlanFile(options.b),
    ]);
  } else {
    if (!config.databaseUrl) {
      throw new Error(
        'No database connection. Provide --db <url> or set DATABASE_URL (or use --from-files).',
      );
    }
    const [sqlA, sqlB] = await Promise.all([
      readSqlFromFileOrStdin(options.a),
      readSqlFromFileOrStdin(options.b),
    ]);
    const spinner = ora('Running EXPLAIN on both queries…').start();
    try {
      planA = await runExplain({
        databaseUrl: config.databaseUrl,
        sql: sqlA,
        timeoutMs,
      });
      planB = await runExplain({
        databaseUrl: config.databaseUrl,
        sql: sqlB,
        timeoutMs,
      });
      spinner.succeed('EXPLAIN complete');
    } catch (err) {
      spinner.fail('EXPLAIN failed');
      throw err;
    }
  }

  const spinner = ora('Comparing plans with QueryViz…').start();
  try {
    const result = await comparePlans(config.apiUrl, planA, planB);
    spinner.succeed('Comparison complete');
    console.log(renderComparison(result));
    console.log(kleur.gray(`Processed in ${result.metadata.processingTime}ms`));
  } catch (err) {
    spinner.fail('Comparison failed');
    if (err instanceof ApiError) {
      const detail = err.details ? ` (${err.details})` : '';
      throw new Error(`${err.message}${detail}`);
    }
    throw err;
  }
}
