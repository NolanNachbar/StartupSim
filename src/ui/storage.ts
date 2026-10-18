// Browser storage that never throws. Private windows, blocked cookies and full quotas all fail quietly,
// and `blocked()` lets the screen say so (DESIGN.md, Saved run).

export interface Backend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SafeStorage {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
  getJson(key: string): unknown;
  setJson(key: string, value: unknown): boolean;
  /** True once any read or write failed, or when there is no storage at all. */
  blocked(): boolean;
}

export function createSafeStorage(backend: Backend | null): SafeStorage {
  let failed = backend === null;
  const attempt = <T>(fallback: T, fn: (b: Backend) => T): T => {
    if (!backend) return fallback;
    try {
      return fn(backend);
    } catch {
      failed = true;
      return fallback;
    }
  };
  const get = (key: string) => attempt<string | null>(null, (b) => b.getItem(key));
  const set = (key: string, value: string) => attempt(false, (b) => (b.setItem(key, value), true));
  return {
    get,
    set,
    remove: (key) => attempt(undefined, (b) => b.removeItem(key)),
    getJson(key) {
      const raw = get(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    },
    setJson: (key, value) => set(key, JSON.stringify(value)),
    blocked: () => failed,
  };
}

/** The real localStorage, or null when the browser will not hand it over. */
export function browserBackend(): Backend | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
