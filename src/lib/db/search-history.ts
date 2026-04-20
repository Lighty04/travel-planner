import { prisma } from '../prisma'
import { AccommodationResult } from '../scraping/booking'
import { FlightResult } from '../scraping/kayak'
import { TrainResult } from '../scraping/sncf'

export type SearchType = 'ACCOMMODATION' | 'TRANSPORT'

export interface AccommodationSearchParams {
  tripId: string
  destination: string
  checkIn: string
  checkOut: string
  guests: number
}

export interface TransportSearchParams {
  tripId: string
  origin: string
  destination: string
  departure: string
  returnDate?: string
  passengers: number
}

type SearchParams = AccommodationSearchParams | TransportSearchParams

export interface SearchHistoryEntry {
  id: string
  userId: string
  type: SearchType
  params: SearchParams
  resultCount: number
  createdAt: Date
}

/**
 * Save accommodation search to history
 */
export async function saveAccommodationSearch(
  userId: string,
  params: AccommodationSearchParams,
  results: AccommodationResult[]
): Promise<void> {
  try {
    await prisma.searchHistory.create({
      data: {
        userId,
        type: 'ACCOMMODATION',
        params: JSON.stringify(params),
        resultCount: results.length,
        tripId: params.tripId,
      },
    })
    console.log(`[SEARCH HISTORY] Saved accommodation search for user ${userId}`)
  } catch (error) {
    console.error('Failed to save accommodation search:', error)
  }
}

/**
 * Save transport search to history
 */
export async function saveTransportSearch(
  userId: string,
  params: TransportSearchParams,
  flights: FlightResult[],
  trains: TrainResult[]
): Promise<void> {
  try {
    await prisma.searchHistory.create({
      data: {
        userId,
        type: 'TRANSPORT',
        params: JSON.stringify(params),
        resultCount: flights.length + trains.length,
        tripId: params.tripId,
      },
    })
    console.log(`[SEARCH HISTORY] Saved transport search for user ${userId}`)
  } catch (error) {
    console.error('Failed to save transport search:', error)
  }
}

/**
 * Get recent searches for a user
 */
export async function getRecentSearches(
  userId: string,
  limit: number = 10
): Promise<SearchHistoryEntry[]> {
  try {
    const searches = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    
    return searches.map((search) => ({
      id: search.id,
      userId: search.userId,
      type: search.type as SearchType,
      params: JSON.parse(search.params),
      resultCount: search.resultCount,
      createdAt: search.createdAt,
    }))
  } catch (error) {
    console.error('Failed to get recent searches:', error)
    return []
  }
}

/**
 * Get recent searches for a specific trip
 */
export async function getTripSearches(
  tripId: string,
  limit: number = 20
): Promise<SearchHistoryEntry[]> {
  try {
    const searches = await prisma.searchHistory.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    
    return searches.map((search) => ({
      id: search.id,
      userId: search.userId,
      type: search.type as SearchType,
      params: JSON.parse(search.params),
      resultCount: search.resultCount,
      createdAt: search.createdAt,
    }))
  } catch (error) {
    console.error('Failed to get trip searches:', error)
    return []
  }
}

/**
 * Clear search history for a user
 */
export async function clearUserSearchHistory(userId: string): Promise<number> {
  try {
    const result = await prisma.searchHistory.deleteMany({
      where: { userId },
    })
    console.log(`[SEARCH HISTORY] Cleared ${result.count} searches for user ${userId}`)
    return result.count
  } catch (error) {
    console.error('Failed to clear search history:', error)
    return 0
  }
}

/**
 * Clear search history for a trip
 */
export async function clearTripSearchHistory(tripId: string): Promise<number> {
  try {
    const result = await prisma.searchHistory.deleteMany({
      where: { tripId },
    })
    console.log(`[SEARCH HISTORY] Cleared ${result.count} searches for trip ${tripId}`)
    return result.count
  } catch (error) {
    console.error('Failed to clear trip search history:', error)
    return 0
  }
}

/**
 * Get search statistics for a user
 */
export async function getUserSearchStats(userId: string): Promise<{
  totalSearches: number
  accommodationSearches: number
  transportSearches: number
  lastSearchAt: Date | null
}> {
  try {
    const [total, accommodation, transport] = await Promise.all([
      prisma.searchHistory.count({ where: { userId } }),
      prisma.searchHistory.count({ where: { userId, type: 'ACCOMMODATION' } }),
      prisma.searchHistory.count({ where: { userId, type: 'TRANSPORT' } }),
    ])
    
    const lastSearch = await prisma.searchHistory.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    
    return {
      totalSearches: total,
      accommodationSearches: accommodation,
      transportSearches: transport,
      lastSearchAt: lastSearch?.createdAt || null,
    }
  } catch (error) {
    console.error('Failed to get search stats:', error)
    return {
      totalSearches: 0,
      accommodationSearches: 0,
      transportSearches: 0,
      lastSearchAt: null,
    }
  }
}

/**
 * Get popular search destinations
 */
export async function getPopularDestinations(limit: number = 10): Promise<
  { destination: string; count: number }[]
> {
  try {
    // Get searches from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const searches = await prisma.searchHistory.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        type: 'ACCOMMODATION',
      },
      select: {
        params: true,
      },
    })
    
    // Count destinations
    const destinationCounts = new Map<string, number>()
    
    for (const search of searches) {
      try {
        const params = JSON.parse(search.params) as AccommodationSearchParams
        const dest = params.destination
        destinationCounts.set(dest, (destinationCounts.get(dest) || 0) + 1)
      } catch {
        // Skip invalid entries
      }
    }
    
    // Sort and return top destinations
    return Array.from(destinationCounts.entries())
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  } catch (error) {
    console.error('Failed to get popular destinations:', error)
    return []
  }
}
