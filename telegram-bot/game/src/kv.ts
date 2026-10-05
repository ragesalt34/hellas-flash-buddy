/** Minimal key-value storage: localStorage in the app, an in-memory map in tests. */
export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function memoryKV(): KV {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
  };
}

export function readJSON<T>(store: KV, key: string): T | null {
  try {
    const s = store.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(store: KV, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — progress on the server is unaffected */
  }
}
