import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchKayak, FlightResult } from '@/lib/scraping/kayak'
import { searchSNCF, TrainResult } from '@/lib/scraping/sncf'
import {
  generateCacheKey,
  getCached,
  setCache,
} from '@/lib/cache/redis'
import { rateLimitMiddleware, getRateLimitHeaders } from '@/lib/rate-limit'
import { saveTransportSearch } from '@/lib/db/search-history'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Cache TTL: 1 hour
const CACHE_TTL = 3600

// Mock data fallback when scrapers fail
function getMockFlightData(origin: string, destination: string): { flights: FlightResult[]; trains: TrainResult[] } {
  const flights: FlightResult[] = [
    {
      id: 'mock-flight-1',
      type: 'FLIGHT',
      airline: 'Air France',
      provider: 'Air France',
      origin,
      destination,
      departure: new Date(Date.now() + 24 * 60 * 60 * 1000),
      arrival: new Date(Date.now() + 26 * 60 * 60 * 1000),
      duration: '2h 30m',
      price: 129,
      currency: 'EUR',
      bookingUrl: `https://www.kayak.com/flights/${origin}-${destination}`,
    },
    {
      id: 'mock-flight-2',
      type: 'FLIGHT',
      airline: 'EasyJet',
      provider: 'EasyJet',
      origin,
      destination,
      departure: new Date(Date.now() + 48 * 60 * 60 * 1000),
      arrival: new Date(Date.now() + 50 * 60 * 60 * 1000),
      duration: '2h 15m',
      price: 89,
      currency: 'EUR',
      bookingUrl: `https://www.kayak.com/flights/${origin}-${destination}`,
    },
    {
      id: 'mock-flight-3',
      type: 'FLIGHT',
      airline: 'Ryanair',
      provider: 'Ryanair',
      origin,
      destination,
      departure: new Date(Date.now() + 72 * 60 * 60 * 1000),
      arrival: new Date(Date.now() + 74 * 60 * 60 * 1000),
      duration: '2h 20m',
      price: 59,
      currency: 'EUR',
      bookingUrl: `https://www.kayak.com/flights/${origin}-${destination}`,
    },
  ]

  const trains: TrainResult[] = [
    {
      id: 'mock-train-1',
      type: 'TRAIN',
      provider: 'SNCF',
      origin,
      destination,
      departure: new Date(Date.now() + 24 * 60 * 60 * 1000),
      arrival: new Date(Date.now() + 28 * 60 * 60 * 1000),
      duration: '4h 15m',
      price: 45,
      currency: 'EUR',
      bookingUrl: 'https://www.sncf-connect.com',
    },
    {
      id: 'mock-train-2',
      type: 'TRAIN',
      provider: 'SNCF',
      origin,
      destination,
      departure: new Date(Date.now() + 48 * 60 * 60 * 1000),
      arrival: new Date(Date.now() + 52 * 60 * 60 * 1000),
      duration: '4h 00m',
      price: 55,
      currency: 'EUR',
      bookingUrl: 'https://www.sncf-connect.com',
    },
  ]

  return { flights, trains }
}

interface TransportSearchParams {
  origin: string
  destination: string
  departure: string
  return?: string
  passengers: number
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  // Check rate limits
  const rateLimit = await rateLimitMiddleware(req)
  if (!rateLimit.allowed) {
    return rateLimit.response!
  }

  try {
    const body = await req.json()
    const { tripId, origin, destination, departure, return: returnDate, passengers } = body

    // Validate required fields
    if (!origin || !destination || !departure || !passengers) {
      return NextResponse.json(
        { error: 'Missing required fields: origin, destination, departure, passengers' },
        { status: 400 }
      )
    }

    // Generate cache key
    const cacheKey = generateCacheKey('transport', {
      origin: origin.toLowerCase(),
      destination: destination.toLowerCase(),
      departure,
      return: returnDate,
      passengers,
    })

    // Check cache first
    const cachedResults = await getCached<
      { flights: FlightResult[]; trains: TrainResult[] }
    >(cacheKey, async () => ({ flights: [], trains: [] }), CACHE_TTL)

    let flightResults: FlightResult[]
    let trainResults: TrainResult[]
    let fromCache = false

    if (
      cachedResults &&
      (cachedResults.flights.length > 0 || cachedResults.trains.length > 0)
    ) {
      // Use cached results
      console.log(`[CACHE HIT] Transport search for ${origin} to ${destination}`)
      flightResults = cachedResults.flights
      trainResults = cachedResults.trains
      fromCache = true
    } else {
      // Cache miss - perform fresh scrape
      console.log(`[CACHE MISS] Scraping transport for ${origin} to ${destination}`)

      try {
        // Search both Kayak (flights) and SNCF (trains)
        const [flights, trains] = await Promise.all([
          searchKayak({ origin, destination, departure, return: returnDate, passengers }),
          searchSNCF({ origin, destination, departure, return: returnDate, passengers }),
        ])

        flightResults = flights
        trainResults = trains
      } catch (scrapeError) {
        console.log('[SCRAPER FAILED] Using mock data fallback:', scrapeError)
        const mockData = getMockFlightData(origin, destination)
        flightResults = mockData.flights
        trainResults = mockData.trains
      }

      // Store results in cache
      await setCache(
        cacheKey,
        { flights: flightResults, trains: trainResults },
        CACHE_TTL
      )
      console.log(
        `[CACHE SET] Stored ${flightResults.length} flights and ${trainResults.length} trains`
      )
    }

    // Save flight results (only if tripId is provided)
    const savedFlights = tripId
      ? await Promise.all(
          flightResults.map(async (flight) =>
            prisma.transportOption.create({
              data: {
                tripId,
                type: 'FLIGHT',
                provider: flight.airline || 'Unknown',
                origin: flight.origin,
                destination: flight.destination,
                departure: flight.departure,
                arrival: flight.arrival,
                price: flight.price,
                currency: flight.currency,
                bookingUrl: flight.bookingUrl,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
              },
            })
          )
        )
      : flightResults.map((f) => ({ ...f, id: `live-${f.id}`, type: 'FLIGHT' }))

    // Save train results (only if tripId is provided)
    const savedTrains = tripId
      ? await Promise.all(
          trainResults.map(async (train) =>
            prisma.transportOption.create({
              data: {
                tripId,
                type: 'TRAIN',
                provider: 'SNCF',
                origin: train.origin,
                destination: train.destination,
                departure: train.departure,
                arrival: train.arrival,
                price: train.price,
                currency: train.currency,
                bookingUrl: train.bookingUrl,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            })
          )
        )
      : trainResults.map((t) => ({ ...t, id: `live-${t.id}`, type: 'TRAIN' }))

    // Save to search history
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      await saveTransportSearch(
        session.user.id,
        { tripId, origin, destination, departure, returnDate, passengers },
        flightResults,
        trainResults
      )
    }

    // Get rate limit headers
    const rateLimitHeaders = await getRateLimitHeaders(req)

    const duration = Date.now() - startTime
    console.log(
      `[API] Transport search completed in ${duration}ms (cached: ${fromCache})`
    )

    return NextResponse.json(
      {
        data: {
          flights: savedFlights,
          trains: savedTrains,
        },
        meta: {
          fromCache,
          duration,
          flightCount: savedFlights.length,
          trainCount: savedTrains.length,
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
    console.error('Transport search error:', error)
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

    const [flights, trains] = await Promise.all([
      prisma.transportOption.findMany({
        where: { tripId, type: 'FLIGHT' },
        orderBy: { price: 'asc' },
      }),
      prisma.transportOption.findMany({
        where: { tripId, type: 'TRAIN' },
        orderBy: { price: 'asc' },
      }),
    ])

    // Get rate limit headers
    const rateLimitHeaders = await getRateLimitHeaders(req)

    return NextResponse.json(
      { data: { flights, trains } },
      { headers: rateLimitHeaders }
    )
  } catch (error) {
    console.error('Failed to get transport options:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transport options' },
      { status: 500 }
    )
  }
}
