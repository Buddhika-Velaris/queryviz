import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function readSqlFromFileOrStdin(
  filePath: string | undefined,
): Promise<string> {
  if (filePath && filePath !== '-') {
    return fs.readFile(path.resolve(filePath), 'utf8');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function readPlanFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(path.resolve(filePath), 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Could not parse ${filePath} as JSON: ${(err as Error).message}`,
    );
  }
}

export async function writePlanFile(
  filePath: string,
  plan: unknown,
): Promise<void> {
  const absolute = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, JSON.stringify(plan, null, 2), 'utf8');
}

export function defaultPlanFilename(): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  return `queryviz-plan-${ts}.json`;
}
