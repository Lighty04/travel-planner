import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'
import { redisClient } from './cache/redis'
import { NextRequest, NextResponse } from 'next/server'

// Rate limiters
const ipLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit_ip',
  points: 10, // 10 requests
  duration: 60, // per minute
})

const sessionLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit_session',
  points: 30, // 30 requests
  duration: 60, // per minute
})

interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: Date | null
  retryAfter: number
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return '127.0.0.1'
}

/**
 * Get session ID from request (cookie or header)
 */
function getSessionID(request: NextRequest): string | null {
  // Try to get from cookie first
  const sessionCookie = request.cookies.get('session-id')?.value
  if (sessionCookie) {
    return sessionCookie
  }
  
  // Fall back to authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  
  return null
}

/**
 * Check rate limit for IP
 */
export async function checkIPRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    await ipLimiter.consume(ip)
    const resRateLimiter = await ipLimiter.get(ip)
    
    return {
      allowed: true,
      limit: 10,
      remaining: resRateLimiter ? Math.max(0, resRateLimiter.remainingPoints) : 0,
      resetTime: resRateLimiter ? new Date(Date.now() + resRateLimiter.msBeforeNext) : null,
      retryAfter: 0,
    }
  } catch (rejRes) {
    const rejectResult = rejRes as RateLimiterRes
    return {
      allowed: false,
      limit: 10,
      remaining: 0,
      resetTime: new Date(Date.now() + rejectResult.msBeforeNext),
      retryAfter: Math.ceil(rejectResult.msBeforeNext / 1000),
    }
  }
}

/**
 * Check rate limit for session
 */
export async function checkSessionRateLimit(sessionId: string): Promise<RateLimitResult> {
  try {
    await sessionLimiter.consume(sessionId)
    const resRateLimiter = await sessionLimiter.get(sessionId)
    
    return {
      allowed: true,
      limit: 30,
      remaining: resRateLimiter ? Math.max(0, resRateLimiter.remainingPoints) : 0,
      resetTime: resRateLimiter ? new Date(Date.now() + resRateLimiter.msBeforeNext) : null,
      retryAfter: 0,
    }
  } catch (rejRes) {
    const rejectResult = rejRes as RateLimiterRes
    return {
      allowed: false,
      limit: 30,
      remaining: 0,
      resetTime: new Date(Date.now() + rejectResult.msBeforeNext),
      retryAfter: Math.ceil(rejectResult.msBeforeNext / 1000),
    }
  }
}

/**
 * Middleware to check rate limits
 * DISABLED: Rate limiting disabled, only cache is used
 */
export async function rateLimitMiddleware(
  request: NextRequest
): Promise<{ allowed: boolean; response?: NextResponse }> {
  // Rate limiting disabled - allow all requests
  return { allowed: true }
}

/**
 * Get rate limit headers for successful requests
 */
export async function getRateLimitHeaders(
  request: NextRequest
): Promise<Record<string, string>> {
  const ip = getClientIP(request)
  const sessionId = getSessionID(request)
  
  const headers: Record<string, string> = {}
  
  try {
    const ipResult = await ipLimiter.get(ip)
    if (ipResult) {
      headers['X-RateLimit-Limit'] = '10'
      headers['X-RateLimit-Remaining'] = String(Math.max(0, ipResult.remainingPoints))
      headers['X-RateLimit-Reset'] = String(Math.floor((Date.now() + ipResult.msBeforeNext) / 1000))
    }
    
    if (sessionId) {
      const sessionResult = await sessionLimiter.get(sessionId)
      if (sessionResult) {
        headers['X-RateLimit-Session-Limit'] = '30'
        headers['X-RateLimit-Session-Remaining'] = String(Math.max(0, sessionResult.remainingPoints))
      }
    }
  } catch {
    // Ignore errors when getting headers
  }
  
  return headers
}

/**
 * Reset rate limit for IP (useful for testing or admin)
 */
export async function resetIPRateLimit(ip: string): Promise<void> {
  await ipLimiter.delete(ip)
}

/**
 * Reset rate limit for session
 */
export async function resetSessionRateLimit(sessionId: string): Promise<void> {
  await sessionLimiter.delete(sessionId)
}
