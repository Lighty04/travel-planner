// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function getCacheKey(prefix: string, params: Record<string, unknown>): string {
  return `${prefix}:${JSON.stringify(params)}`
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttlHours: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
  })
}

export function clearCache(): void {
  cache.clear()
}