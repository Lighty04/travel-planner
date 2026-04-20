'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Bed, Plane, Train, Bus, Search } from 'lucide-react'

interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  travelers: number
  status: string
}

interface AccommodationResult {
  id: string
  name: string
  price: number
  rating: number
  image?: string
  url: string
}

interface TransportResult {
  id: string
  type: 'Flight' | 'Train' | 'Bus'
  price: number
  duration: string
  url: string
}

export default function TripDetailPage() {
  const params = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [accommodationResults, setAccommodationResults] = useState<AccommodationResult[]>([])
  const [transportResults, setTransportResults] = useState<TransportResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    fetch(`/api/trips/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setTrip(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleSearch = useCallback(async () => {
    if (!trip) return
    
    setIsSearching(true)
    setHasSearched(true)
    
    try {
      // For transport, we need an origin. Let's use a default or prompt user.
      // Using trip.destination as both origin and destination for now, 
      // or we could add an origin field to the trip
      const origin = 'Paris' // Default origin, could be stored in trip
      
      const [accRes, transRes] = await Promise.all([
        fetch('/api/search/accommodation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: trip.destination,
            checkIn: trip.startDate,
            checkOut: trip.endDate,
            guests: trip.travelers,
          }),
        }),
        fetch('/api/search/transport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            destination: trip.destination,
            departure: trip.startDate,
            return: trip.endDate,
            passengers: trip.travelers,
          }),
        })
      ])

      const accData = accRes.ok ? await accRes.json() : null
      const transData = transRes.ok ? await transRes.json() : null

      if (accData?.results) {
        setAccommodationResults(accData.results)
      } else {
        setAccommodationResults([])
      }

      if (transData?.results) {
        setTransportResults(transData.results)
      } else {
        setTransportResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setAccommodationResults([])
      setTransportResults([])
    } finally {
      setIsSearching(false)
    }
  }, [trip])

  if (loading) return <div className="p-6">Loading...</div>
  if (!trip) return <div className="p-6">Trip not found</div>

  const TransportIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'Flight': return <Plane className="h-5 w-5" />
      case 'Train': return <Train className="h-5 w-5" />
      default: return <Bus className="h-5 w-5" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/trips" className="text-sm text-muted-foreground hover:underline">← Back to trips</Link>
          <h1 className="text-2xl font-bold">{trip.destination}</h1>
        </div>
        <Button variant="outline">Edit Trip</Button>
      </div>

      {/* Trip Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">Dates:</span> {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</p>
          <p><span className="font-medium">Travelers:</span> {trip.travelers}</p>
          <p><span className="font-medium">Status:</span> {trip.status}</p>
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Accommodation & Transport
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSearch} 
            disabled={isSearching}
            className="w-full"
            size="lg"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>Search Accommodation & Transport</>
            )}
          </Button>

          {hasSearched && !isSearching && (
            <div className="mt-6 space-y-6">
              {/* Accommodation Results */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Bed className="h-5 w-5" />
                  Accommodation ({accommodationResults.length} found)
                </h3>
                {accommodationResults.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {accommodationResults.map((acc) => (
                      <Card key={acc.id} className="overflow-hidden">
                        {acc.image && (
                          <img src={acc.image} alt={acc.name} className="w-full h-32 object-cover" />
                        )}
                        <CardContent className="p-4">
                          <h4 className="font-semibold truncate">{acc.name}</h4>
                          <p className="text-sm text-muted-foreground">⭐ {acc.rating} / 5</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-lg">{acc.price}€</span>
                            <a href={acc.url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">Book</Button>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No accommodation found for these dates.</p>
                )}
              </div>

              {/* Transport Results */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Transport ({transportResults.length} found)</h3>
                {transportResults.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {transportResults.map((trans) => (
                      <Card key={trans.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TransportIcon type={trans.type} />
                            <h4 className="font-semibold">{trans.type}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">⏱️ {trans.duration}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-lg">{trans.price}€</span>
                            <a href={trans.url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">Book</Button>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No transport found for these dates.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
