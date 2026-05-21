const STORAGE_KEY = "wxBaseUrl";
const CACHE_PREFIX = "wx:cache:";
const CACHE_INDEX_KEY = "wx:cache:idx";
const DEFAULT_TTL =
  process.env.NODE_ENV === "production" ? 3_600_000 : 60_000; // 1 hour in prod, 1 min in dev

export type WxCacheConfig = {
  enabled?: boolean;
  ttl?: number;
};

type CacheEntry = {
  data: unknown;
  cachedAt: number;
  ttl: number;
};

const inflightRequests = new Map<string, Promise<unknown>>();

export function getWxBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getCacheKey(
  method: string,
  baseUrl: string,
  path: string,
  body: BodyInit | null | undefined
): string {
  let keySource = `${method}:${baseUrl}:${path}`;
  if (body) {
    keySource += `:${typeof body === "string" ? body : JSON.stringify(body)}`;
  }
  return `${CACHE_PREFIX}${hashString(keySource)}`;
}

function getCacheIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCacheIndex(index: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch {
    // localStorage unavailable
  }
}

function evictCache(): void {
  const index = getCacheIndex();
  if (index.length === 0) return;
  const removeCount = Math.ceil(index.length / 2);
  const toRemove = index.splice(0, removeCount);
  for (const key of toRemove) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore individual removal failures
    }
  }
  saveCacheIndex(index);
}

function getFromCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > entry.ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

function setInCache(key: string, data: unknown, ttl: number): void {
  if (typeof window === "undefined") return;
  const entry: CacheEntry = { data, cachedAt: Date.now(), ttl };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      evictCache();
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // still can't write, give up
      }
    }
  }
  const index = getCacheIndex().filter((k) => k !== key);
  index.push(key);
  saveCacheIndex(index);
}

function shouldCacheResponse(data: unknown): boolean {
  if (data && typeof data === "object" && "code" in data) {
    return (data as Record<string, unknown>).code === "000000";
  }
  return true;
}

export async function wxFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  cacheConfig?: boolean | WxCacheConfig
): Promise<T> {
  const baseUrl = getWxBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "WeChat API base URL is not configured. Please set it in Settings."
    );
  }

  let enabled = true;
  let ttl = DEFAULT_TTL;
  if (cacheConfig === false) {
    enabled = false;
  } else if (cacheConfig && typeof cacheConfig === "object") {
    enabled = cacheConfig.enabled ?? true;
    ttl = cacheConfig.ttl ?? DEFAULT_TTL;
  }

  const method = (options.method || "GET").toUpperCase();
  const cacheable = enabled && (method === "GET" || method === "HEAD");
  const cacheKey = cacheable
    ? getCacheKey(method, baseUrl, path, options.body)
    : null;

  if (cacheKey) {
    const cached = getFromCache<T>(cacheKey);
    if (cached !== null) return cached;

    const inflight = inflightRequests.get(cacheKey);
    if (inflight) return inflight as Promise<T>;
  }

  const promise = doFetch<T>(baseUrl, path, options);

  if (cacheKey) {
    inflightRequests.set(cacheKey, promise);
    promise
      .then((data) => {
        if (shouldCacheResponse(data)) {
          setInCache(cacheKey, data, ttl);
        }
      })
      .finally(() => {
        inflightRequests.delete(cacheKey);
      });
  }

  return promise;
}

async function doFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestInit
): Promise<T> {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const res = await fetch(`/api/wx-proxy/${cleanPath}`, {
    ...options,
    headers: {
      ...options.headers,
      "X-Wx-Base-Url": baseUrl,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed with status ${res.status}`);
  }
  return res.json();
}