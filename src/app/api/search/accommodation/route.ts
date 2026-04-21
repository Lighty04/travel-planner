import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchHotels, AccommodationResult } from '@/lib/scraping/amadeus-hotels'
import {
  generateCacheKey,
  getCached,
  setCache,
} from '@/lib/cache/redis'
import { rateLimitMiddleware, getRateLimitHeaders } from '@/lib/rate-limit'
import { saveAccommodationSearch } from '@/lib/db/search-history'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Cache TTL: 1 hour
const CACHE_TTL = 3600

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  // Check rate limits
  const rateLimit = await rateLimitMiddleware(req)
  if (!rateLimit.allowed) {
    return rateLimit.response!
  }
  
  try {
    const body = await req.json()
    const { tripId, destination, checkIn, checkOut, guests } = body
    
    // Validate required fields
    if (!destination || !checkIn || !checkOut || !guests) {
      return NextResponse.json(
        { error: 'Missing required fields: destination, checkIn, checkOut, guests' },
        { status: 400 }
      )
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey('accommodation', {
      destination: destination.toLowerCase(),
      checkIn,
      checkOut,
      guests,
    })
    
    // Check cache first
    const cachedResults = await getCached<AccommodationResult[]>(
      cacheKey,
      async () => [],
      CACHE_TTL
    )
    
    let results: AccommodationResult[]
    let fromCache = false
    
    if (cachedResults && cachedResults.length > 0) {
      // Use cached results
      console.log(`[CACHE HIT] Accommodation search for ${destination}`)
      results = cachedResults
      fromCache = true
    } else {
      // Cache miss - perform fresh scrape
      console.log(`[CACHE MISS] Scraping Booking.com for ${destination}`)
      try {
        results = await searchHotels({
          destination,
          checkIn,
          checkOut,
          guests,
        })
      } catch (scrapeError) {
        console.error('[SCRAPER FAILED] Hotel search service unavailable:', scrapeError)
        return NextResponse.json(
          { error: 'Hotel search service unavailable' },
          { status: 503 }
        )
      }
      
      // Store results in cache
      if (results.length > 0) {
        await setCache(cacheKey, results, CACHE_TTL)
        console.log(`[CACHE SET] Stored ${results.length} accommodation results`)
      }
    }
    
    // Save results to database (only if tripId is provided)
    const saved = tripId
      ? await Promise.all(
          results.map(async (hotel) =>
            prisma.accommodation.create({
              data: {
                tripId,
                provider: 'booking.com',
                name: hotel.name,
                address: hotel.address,
                pricePerNight: hotel.pricePerNight,
                totalPrice: hotel.totalPrice,
                currency: hotel.currency,
                rating: hotel.rating,
                reviewCount: hotel.reviewCount,
                amenities: hotel.amenities,
                bookingUrl: hotel.bookingUrl,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
              },
            })
          )
        )
      : results
    
    // Save to search history
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      await saveAccommodationSearch(
        session.user.id,
        { tripId, destination, checkIn, checkOut, guests },
        results
      )
    }
    
    // Get rate limit headers
    const rateLimitHeaders = await getRateLimitHeaders(req)
    
    const duration = Date.now() - startTime
    console.log(`[API] Accommodation search completed in ${duration}ms (cached: ${fromCache})`)
    
    return NextResponse.json(
      {
        data: saved,
        meta: {
          fromCache,
          duration,
          resultCount: saved.length,
        },
      },
      {
        headers: {
          'X-Cache-Status': fromCache ? 'HIT' : 'MISS',
          ...rateLimitHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Accommodation search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  // Check rate limits
  const rateLimit = await rateLimitMiddleware(req)
  if (!rateLimit.allowed) {
    return rateLimit.response!
  }
  
  try {
    const { searchParams } = new URL(req.url)
    const tripId = searchParams.get('tripId')
    
    if (!tripId) {
      return NextResponse.json(
        { error: 'tripId is required' },
        { status: 400 }
      )
    }
    
    const accommodations = await prisma.accommodation.findMany({
      where: { tripId },
      orderBy: { pricePerNight: 'asc' },
    })
    
    // Get rate limit headers
    const rateLimitHeaders = await getRateLimitHeaders(req)
    
    return NextResponse.json(
      { data: accommodations },
      { headers: rateLimitHeaders }
    )
  } catch (error) {
    console.error('Failed to get accommodations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accommodations' },
      { status: 500 }
    )
  }
}