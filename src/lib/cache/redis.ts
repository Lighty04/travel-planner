import Redis from 'ioredis'
import crypto from 'crypto'

// Redis client singleton
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

redisClient.on('error', (err) => {
  console.error('Redis error:', err)
})

redisClient.on('connect', () => {
  console.log('Redis connected')
})

// Cache TTL in seconds (1 hour default)
const DEFAULT_TTL = 3600

// Popular destinations for background refresh
const POPULAR_DESTINATIONS = [
  'Paris',
  'Lyon',
  'Marseille',
  'Nice',
  'Bordeaux',
  'Lille',
  'Strasbourg',
  'Nantes',
  'Toulouse',
]

/**
 * Generate a cache key from search parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, value]) => value !== undefined && value !== null)
  
  const paramsString = JSON.stringify(sortedParams)
  const hash = crypto.createHash('sha256').update(paramsString).digest('hex').slice(0, 16)
  
  return `${prefix}:${hash}`
}

/**
 * Get cached data with fallback
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  try {
    const cached = await redisClient.get(key)
    
    if (cached) {
      console.log(`[CACHE HIT] ${key}`)
      return JSON.parse(cached) as T
    }
    
    console.log(`[CACHE MISS] ${key}`)
    const data = await fetcher()
    
    // Store in cache
    await redisClient.setex(key, ttlSeconds, JSON.stringify(data))
    
    return data
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error)
    // Fallback to direct fetch on cache error
    return fetcher()
  }
}

/**
 * Set cached data
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    console.error(`Failed to cache data for key ${key}:`, error)
  }
}

/**
 * Delete cached data
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redisClient.del(key)
  } catch (error) {
    console.error(`Failed to delete cache key ${key}:`, error)
  }
}

/**
 * Check if cache exists
 */
export async function hasCache(key: string): Promise<boolean> {
  try {
    const exists = await redisClient.exists(key)
    return exists === 1
  } catch {
    return false
  }
}

/**
 * Get cache TTL remaining
 */
export async function getCacheTTL(key: string): Promise<number> {
  try {
    return await redisClient.ttl(key)
  } catch {
    return -1
  }
}

/**
 * Refresh cache for a key
 */
export async function refreshCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T | null> {
  try {
    const data = await fetcher()
    await setCache(key, data, ttlSeconds)
    console.log(`[CACHE REFRESHED] ${key}`)
    return data
  } catch (error) {
    console.error(`Failed to refresh cache for key ${key}:`, error)
    return null
  }
}

/**
 * Background refresh for popular destinations
 */
export async function refreshPopularDestination(
  prefix: 'accommodation' | 'transport',
  destination: string
): Promise<void> {
  const key = generateCacheKey(prefix, { destination })
  const exists = await hasCache(key)
  
  if (exists) {
    const ttl = await getCacheTTL(key)
    // Refresh if less than 15 minutes remaining
    if (ttl > 0 && ttl < 900) {
      console.log(`[BACKGROUND REFRESH] ${prefix} for ${destination}`)
      // Note: actual fetcher would be passed in real implementation
    }
  }
}

/**
 * Run background refresh for all popular destinations
 */
export async function runBackgroundRefresh(): Promise<void> {
  console.log('[BACKGROUND REFRESH] Starting...')
  
  for (const destination of POPULAR_DESTINATIONS) {
    // Check and potentially refresh accommodation cache
    const accKey = generateCacheKey('accommodation', { destination })
    const accTTL = await getCacheTTL(accKey)
    if (accTTL > 0 && accTTL < 900) {
      console.log(`[BACKGROUND REFRESH] Accommodation for ${destination} (TTL: ${accTTL}s)`)
    }
    
    // Check and potentially refresh transport cache
    const transKey = generateCacheKey('transport', { destination })
    const transTTL = await getCacheTTL(transKey)
    if (transTTL > 0 && transTTL < 900) {
      console.log(`[BACKGROUND REFRESH] Transport for ${destination} (TTL: ${transTTL}s)`)
    }
  }
  
  console.log('[BACKGROUND REFRESH] Completed')
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean
  dbSize: number
}> {
  try {
    const info = await redisClient.info('keyspace')
    const dbSize = await redisClient.dbsize()
    return {
      connected: redisClient.status === 'ready',
      dbSize,
    }
  } catch {
    return {
      connected: false,
      dbSize: 0,
    }
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  await redisClient.quit()
}

export { redisClient }
