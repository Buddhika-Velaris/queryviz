import kleur from 'kleur';
import ora from 'ora';
import { analyzeSingle, ApiError } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { runExplain } from '../lib/explain.js';
import {
  defaultPlanFilename,
  readSqlFromFileOrStdin,
  writePlanFile,
} from '../lib/io.js';
import { renderSingle } from '../lib/render.js';

export interface RunOptions {
  sql?: string;
  file?: string;
  db?: string;
  apiUrl?: string;
  save?: string;
  noUpload?: boolean;
  timeout?: string;
  debug?: boolean;
  verbose?: boolean;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const config = loadConfig({
    apiUrl: options.apiUrl,
    databaseUrl: options.db,
  });

  if (!config.databaseUrl) {
    throw new Error(
      'No database connection. Provide --db <url> or set DATABASE_URL.',
    );
  }

  const sql = options.sql ?? (await readSqlFromFileOrStdin(options.file));
  if (!sql.trim()) {
    throw new Error('SQL is empty.');
  }

  const timeoutMs = options.timeout
    ? Math.max(1000, Number(options.timeout) * 1000)
    : undefined;

  const explainSpinner = ora('Running EXPLAIN (ANALYZE, BUFFERS)…').start();
  let plan: unknown;
  try {
    plan = await runExplain({
      databaseUrl: config.databaseUrl,
      sql,
      timeoutMs,
      debug: options.debug,
      verbose: options.verbose,
    });
    explainSpinner.succeed('EXPLAIN complete');
  } catch (err) {
    explainSpinner.fail('EXPLAIN failed');
    throw err;
  }

  if (options.save !== undefined) {
    const target = options.save || defaultPlanFilename();
    await writePlanFile(target, plan);
    console.log(kleur.gray(`Plan saved → ${target}`));
  }

  if (options.noUpload) {
    console.log(
      kleur.yellow(
        '\n--no-upload set: skipped analysis. Use `queryviz upload <file>` later.',
      ),
    );
    return;
  }

  const analyzeSpinner = ora('Analyzing with QueryViz…').start();
  try {
    const result = await analyzeSingle(config.apiUrl, plan);
    analyzeSpinner.succeed('Analysis complete');
    console.log(renderSingle(result));
    console.log(kleur.gray(`Processed in ${result.metadata.processingTime}ms`));
  } catch (err) {
    analyzeSpinner.fail('Analysis failed');
    if (err instanceof ApiError) {
      const detail = err.details ? ` (${err.details})` : '';
      throw new Error(`${err.message}${detail}`);
    }
    throw err;
  }
}
