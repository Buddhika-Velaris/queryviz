import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Disk-backed cache keyed by SHA-256 of (namespace + inputs). One JSON file per
// namespace. Survives server restarts so LLM calls aren't repeated. Falls back
// to in-memory-only if the disk write fails (e.g. read-only FS).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', '..', '.cache', 'llm');

interface Entry<T> {
  value: T;
  savedAt: string;
}

type NamespaceCache = Record<string, Entry<unknown>>;

const memory = new Map<string, NamespaceCache>();
const loading = new Map<string, Promise<NamespaceCache>>();
const writeQueue = new Map<string, Promise<void>>();

function filePathFor(namespace: string): string {
  return path.join(CACHE_DIR, `${namespace}.json`);
}

async function loadNamespace(namespace: string): Promise<NamespaceCache> {
  const cached = memory.get(namespace);
  if (cached) return cached;
  const pending = loading.get(namespace);
  if (pending) return pending;

  const p = (async () => {
    try {
      const buf = await fs.readFile(filePathFor(namespace), 'utf8');
      const data = JSON.parse(buf) as NamespaceCache;
      memory.set(namespace, data);
      return data;
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        console.warn(`[cache] failed to load ${namespace}:`, err.message);
      }
      const empty: NamespaceCache = {};
      memory.set(namespace, empty);
      return empty;
    }
  })();
  loading.set(namespace, p);
  try {
    return await p;
  } finally {
    loading.delete(namespace);
  }
}

async function persistNamespace(namespace: string): Promise<void> {
  const data = memory.get(namespace);
  if (!data) return;
  const existing = writeQueue.get(namespace) ?? Promise.resolve();
  const next = existing.then(async () => {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(filePathFor(namespace), JSON.stringify(data), 'utf8');
    } catch (err: any) {
      console.warn(`[cache] failed to persist ${namespace}:`, err.message);
    }
  });
  writeQueue.set(namespace, next);
  await next;
  if (writeQueue.get(namespace) === next) writeQueue.delete(namespace);
}

export function hashKey(...parts: (string | number | undefined)[]): string {
  const h = createHash('sha256');
  for (const p of parts) h.update(String(p ?? '') + '\u0000');
  return h.digest('hex').slice(0, 32);
}

export async function getCached<T>(namespace: string, key: string): Promise<T | null> {
  const ns = await loadNamespace(namespace);
  const entry = ns[key];
  return entry ? (entry.value as T) : null;
}

export async function setCached<T>(namespace: string, key: string, value: T): Promise<void> {
  const ns = await loadNamespace(namespace);
  ns[key] = { value, savedAt: new Date().toISOString() };
  await persistNamespace(namespace);
}

export async function getOrCompute<T>(
  namespace: string,
  key: string,
  compute: () => Promise<T>,
): Promise<{ value: T; cached: boolean }> {
  const hit = await getCached<T>(namespace, key);
  if (hit !== null && hit !== undefined) return { value: hit, cached: true };
  const value = await compute();
  await setCached(namespace, key, value);
  return { value, cached: false };
}
