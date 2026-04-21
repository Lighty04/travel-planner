'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Star, Plane, Train, Hotel } from 'lucide-react'

interface AccommodationResult {
  id: string
  name: string
  address?: string
  pricePerNight?: number
  totalPrice?: number
  currency: string
  rating?: number
  reviewCount?: number
  amenities?: string[]
  bookingUrl?: string
  imageUrl?: string
}

interface TransportResult {
  id: string
  type: 'FLIGHT' | 'TRAIN'
  provider: string
  origin: string
  destination: string
  departure: string
  arrival: string
  price: number
  currency: string
  bookingUrl?: string
}

interface SearchResultsProps {
  results: { accommodation?: AccommodationResult[]; transport?: { flights: TransportResult[]; trains: TransportResult[] } } | null
  isLoading: boolean
  error: string | null
  searchParams?: {
    checkIn: string
    checkOut: string
    guests: number
    rooms: number
  }
}

function buildBookingUrl(baseUrl: string, params: { checkIn: string; checkOut: string; guests: number; rooms: number }) {
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('checkin', params.checkIn)
    url.searchParams.set('checkout', params.checkOut)
    url.searchParams.set('group_adults', String(params.guests))
    url.searchParams.set('no_rooms', String(params.rooms))
    return url.toString()
  } catch {
    return baseUrl
  }
}

export function SearchResults({ results, isLoading, error, searchParams }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Searching for the best options...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Search failed</p>
          <p className="text-sm">{error}</p>
        </div>
        <p className="text-muted-foreground">Please try again with different search criteria.</p>
      </div>
    )
  }

  if (!results) {
    return null
  }

  const accommodations = results.accommodation || []
  const transport = results.transport || { flights: [], trains: [] }
  const hasResults = accommodations.length > 0 || transport.flights.length > 0 || transport.trains.length > 0

  if (!hasResults) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Hotel className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No results found for your search.</p>
        <p className="text-sm">Try different dates or location.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Accommodations */}
      {accommodations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Accommodations ({accommodations.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accommodations.map((hotel) => (
              <Card key={hotel.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Hotel className="h-16 w-16 text-primary/30" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{hotel.name}</CardTitle>
                  {hotel.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {hotel.address}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {hotel.rating && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{hotel.rating}</span>
                      </div>
                      {hotel.reviewCount && (
                        <span className="text-sm text-muted-foreground">({hotel.reviewCount} reviews)</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-end justify-between pt-2 border-t">
                    <div>
                      {hotel.pricePerNight && (
                        <p className="text-2xl font-bold">
                          {hotel.pricePerNight} <span className="text-sm font-normal text-muted-foreground">{hotel.currency}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">per night</p>
                    </div>
                    {hotel.bookingUrl && searchParams && (
                      <Button asChild size="sm">
                        <a
                          href={buildBookingUrl(hotel.bookingUrl, searchParams)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col leading-tight"
                        >
                          <span>Book Now</span>
                          <span className="text-[10px] opacity-80 font-normal">on Booking.com</span>
                        </a>
                      </Button>
                    )}
                    {hotel.bookingUrl && !searchParams && (
                      <Button asChild size="sm">
                        <a href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer">
                          Book Now
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Transport - Flights */}
      {transport.flights?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Flights ({transport.flights.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {transport.flights.map((flight) => (
              <TransportCard key={flight.id} transport={flight} icon={<Plane className="h-4 w-4" />} />
            ))}
          </div>
        </div>
      )}

      {/* Transport - Trains */}
      {transport.trains?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Train className="h-5 w-5" />
            Trains ({transport.trains.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {transport.trains.map((train) => (
              <TransportCard key={train.id} transport={train} icon={<Train className="h-4 w-4" />} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TransportCard({ transport, icon }: { transport: TransportResult; icon: React.ReactNode }) {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (departure: string, arrival: string) => {
    const dep = new Date(departure)
    const arr = new Date(arrival)
    const durationMs = arr.getTime() - dep.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{transport.provider}</span>
          </div>
          <span className="text-lg font-bold">
            {transport.price} <span className="text-sm font-normal text-muted-foreground">{transport.currency}</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <p className="font-semibold text-lg">{formatTime(transport.departure)}</p>
            <p className="text-muted-foreground">{transport.origin}</p>
          </div>
          <div className="flex-1 mx-4 flex flex-col items-center">
            <span className="text-xs text-muted-foreground">
              {formatDuration(transport.departure, transport.arrival)}
            </span>
            <div className="w-full h-px bg-border my-1 relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">{formatTime(transport.arrival)}</p>
            <p className="text-muted-foreground">{transport.destination}</p>
          </div>
        </div>

        {transport.bookingUrl && (
          <Button asChild className="w-full" size="sm">
            <a href={transport.bookingUrl} target="_blank" rel="noopener noreferrer">
              Book Now
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
