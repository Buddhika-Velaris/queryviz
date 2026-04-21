#!/usr/bin/env node
import { Command } from 'commander';
import kleur from 'kleur';
import { compareCommand } from './commands/compare.js';
import { runCommand } from './commands/run.js';
import { uploadCommand } from './commands/upload.js';

const program = new Command();

program
  .name('queryviz')
  .description(
    'Run PostgreSQL EXPLAIN locally and analyze the plan with QueryViz',
  )
  .version('0.1.0')
  .showHelpAfterError();

program
  .command('run')
  .description('Run a SQL query through EXPLAIN and analyze the plan')
  .argument('[sql]', 'inline SQL (quoted). Omit to read from --file or stdin.')
  .option('-f, --file <path>', 'read SQL from a file (use - for stdin)')
  .option(
    '-d, --db <url>',
    'database connection string (defaults to $DATABASE_URL)',
  )
  .option(
    '--api-url <url>',
    'QueryViz API base URL (defaults to $QUERYVIZ_API_URL)',
  )
  .option(
    '-s, --save [path]',
    'save plan JSON to a file (path optional; auto-named if omitted)',
  )
  .option('--no-upload', 'skip the QueryViz analysis call')
  .option(
    '-t, --timeout <seconds>',
    'statement timeout for EXPLAIN (default 60)',
  )
  .option('--debug', 'print the exact SQL sent to Postgres')
  .option('--verbose', 'add VERBOSE to EXPLAIN (may fail on some proxies)')
  .action(async (sql: string | undefined, opts) => {
    await runCommand({ sql, ...opts });
  });

program
  .command('upload')
  .description('Upload an existing plan JSON file for analysis')
  .argument('<file>', 'path to a plan JSON file')
  .option('--api-url <url>', 'QueryViz API base URL')
  .action(async (file: string, opts) => {
    await uploadCommand({ file, ...opts });
  });

program
  .command('compare')
  .description('Compare two queries (or two plan JSON files)')
  .requiredOption('-a <sqlOrFile>', 'first SQL/file')
  .requiredOption('-b <sqlOrFile>', 'second SQL/file')
  .option('--from-files', 'treat -a and -b as paths to plan JSON files')
  .option('-d, --db <url>', 'database connection string (for --from-files off)')
  .option('--api-url <url>', 'QueryViz API base URL')
  .option(
    '-t, --timeout <seconds>',
    'statement timeout for EXPLAIN (default 60)',
  )
  .action(async (opts) => {
    await compareCommand(opts);
  });

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(kleur.red(`\n✖ ${msg}`));
    process.exitCode = 1;
  }
}

main();
