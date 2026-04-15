// localStorage-backed cache with FNV-1a hashing. Keeps LLM responses across
// page reloads so identical calls never hit the network.

const PREFIX = 'queryviz:cache:';
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface Entry<T> {
  value: T;
  savedAt: number;
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(36);
}

export function cacheKey(namespace: string, ...parts: (string | number | undefined)[]): string {
  return `${PREFIX}${namespace}:${fnv1a(parts.map(p => String(p ?? '')).join('\u0000'))}`;
}

export function readCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.savedAt > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    const entry: Entry<T> = { value, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // quota — evict some old cache entries and retry once.
    pruneOldest();
    try {
      const entry: Entry<T> = { value, savedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch { /* give up silently */ }
  }
}

function pruneOldest(): void {
  const keys: { k: string; savedAt: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(k) || '{}') as Entry<unknown>;
      keys.push({ k, savedAt: parsed.savedAt ?? 0 });
    } catch {
      keys.push({ k, savedAt: 0 });
    }
  }
  keys.sort((a, b) => a.savedAt - b.savedAt);
  for (let i = 0; i < Math.ceil(keys.length / 4); i++) {
    localStorage.removeItem(keys[i].k);
  }
}

export async function cachedCall<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = readCache<T>(key, ttlMs);
  if (hit !== null && hit !== undefined) return hit;
  const value = await fn();
  writeCache(key, value);
  return value;
}
