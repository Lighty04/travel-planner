'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, Bed, Plane, Train, Bus, Search, Check, ExternalLink, 
  DollarSign, Calendar, Users, MapPin, ArrowRight, ShoppingCart,
  Hotel, Clock, Star, CreditCard
} from 'lucide-react'

interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  travelers: number
  status: string
  budgetMin?: number
  budgetMax?: number
  nights: number
}

interface TransportOption {
  id: string
  type: 'FLIGHT' | 'TRAIN' | 'BUS'
  provider: string
  origin: string
  destination: string
  departure: string
  arrival: string
  price: number | string
  currency: string
  duration?: string
  bookingUrl: string
  selected: boolean
  status: string
  airline?: string
  class?: string
}

interface Accommodation {
  id: string
  name: string
  address: string
  pricePerNight: number | string
  totalPrice: number | string
  currency: string
  rating: number
  reviewCount: number
  amenities: string[]
  bookingUrl: string
  selected: boolean
  status: string
}

interface Budget {
  transport: { cost: number; selected: any }
  accommodation: { cost: number; selected: any; nights: number }
  activities: { cost: number; count: number }
  total: number
  withinBudget: boolean | null
  remaining: number | null
}

export default function TripDetailPage() {
  const params = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [transportResults, setTransportResults] = useState<TransportOption[]>([])
  const [accommodationResults, setAccommodationResults] = useState<Accommodation[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  
  // Selection state
  const [selectedTransport, setSelectedTransport] = useState<TransportOption | null>(null)
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null)
  const [budget, setBudget] = useState<Budget | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  // Fetch trip data
  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch trip')
      const data = await res.json()
      setTrip(data)
      
      // Set pre-selected items
      if (data.selectedTransport) setSelectedTransport(data.selectedTransport)
      if (data.selectedAccommodation) setSelectedAccommodation(data.selectedAccommodation)
    } catch {
      setLoading(false)
    }
  }, [params.id])

  // Fetch budget
  const fetchBudget = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${params.id}/budget`)
      if (res.ok) {
        const data = await res.json()
        setBudget(data.breakdown)
      }
    } catch {
      // ignore
    }
  }, [params.id])

  useEffect(() => {
    fetchTrip().then(() => setLoading(false))
    fetchBudget()
  }, [fetchTrip, fetchBudget])

  const handleSearch = useCallback(async () => {
    if (!trip) return
    setIsSearching(true)
    setHasSearched(true)
    
    try {
      const origin = 'Paris' // Default origin
      
      const [accRes, transRes] = await Promise.all([
        fetch('/api/search/accommodation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: trip.id,
            destination: trip.destination,
            checkIn: trip.startDate.split('T')[0],
            checkOut: trip.endDate.split('T')[0],
            guests: trip.travelers,
          }),
        }),
        fetch('/api/search/transport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: trip.id,
            origin,
            destination: trip.destination,
            departure: trip.startDate.split('T')[0],
            return: trip.endDate.split('T')[0],
            passengers: trip.travelers,
          }),
        })
      ])

      const accData = accRes.ok ? await accRes.json() : null
      const transData = transRes.ok ? await transRes.json() : null

      setAccommodationResults(accData?.data || [])
      setTransportResults(transData?.data?.trains || transData?.data?.flights || [])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [trip])

  const handleSelect = async (type: 'transport' | 'accommodation', optionId: string, selected: boolean) => {
    setSelecting(`${type}-${optionId}`)
    try {
      const res = await fetch(`/api/trips/${params.id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, optionId, selected }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setSelectedTransport(data.transport)
        setSelectedAccommodation(data.accommodation)
        setBudget(prev => prev ? { ...prev, total: data.totalCost } : null)
      }
    } catch {
      // ignore
    } finally {
      setSelecting(null)
    }
  }

  const handleConfirmBooking = async (type: 'transport' | 'accommodation', optionId: string) => {
    setConfirming(`${type}-${optionId}`)
    try {
      const res = await fetch(`/api/trips/${params.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, optionId }),
      })
      
      if (res.ok) {
        const data = await res.json()
        // Refresh trip data
        fetchTrip()
        fetchBudget()
      }
    } catch {
      // ignore
    } finally {
      setConfirming(null)
    }
  }

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price
    return Math.round(num).toLocaleString('fr-FR')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { 
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
    })
  }

  const TransportIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'FLIGHT': return <Plane className="h-5 w-5 text-blue-500" />
      case 'TRAIN': return <Train className="h-5 w-5 text-green-500" />
      default: return <Bus className="h-5 w-5 text-orange-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED': return 'bg-green-100 text-green-800'
      case 'SELECTED': return 'bg-blue-100 text-blue-800'
      case 'PENDING': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
  
  if (!trip) return (
    <div className="max-w-4xl mx-auto p-6">
      <p className="text-muted-foreground">Voyage non trouvé</p>
      <Link href="/trips">
        <Button variant="link">← Retour aux voyages</Button>
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <Link href="/trips" className="text-sm text-primary-foreground/80 hover:underline">← Retour</Link>
          <h1 className="text-2xl font-bold mt-2">{trip.destination}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-primary-foreground/80">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(trip.startDate).toLocaleDateString('fr-FR')} - {new Date(trip.endDate).toLocaleDateString('fr-FR')}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {trip.travelers} voyageurs</span>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {trip.nights} nuits</span>
            <Badge className={getStatusColor(trip.status)}>
              {trip.status === 'DRAFT' ? 'Brouillon' : trip.status === 'PLANNING' ? 'Planification' : trip.status === 'BOOKED' ? 'Réservé' : 'Terminé'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Budget Summary */}
        {budget && (
          <Card className="mb-6 border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Budget total estimé</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  {budget.transport.selected && (
                    <span className="flex items-center gap-1">
                      <Plane className="h-4 w-4 text-blue-500" />
                      Transport: <strong>{formatPrice(budget.transport.cost)}€</strong>
                    </span>
                  )}
                  {budget.accommodation.selected && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-4 w-4 text-green-500" />
                      Hébergement: <strong>{formatPrice(budget.accommodation.cost)}€</strong>
                    </span>
                  )}
                  <Separator orientation="vertical" className="h-6" />
                  <span className="text-lg font-bold">{formatPrice(budget.total)}€</span>
                  {trip.budgetMax && (
                    <Badge variant={budget.total <= trip.budgetMax ? 'default' : 'destructive'}>
                      {budget.total <= trip.budgetMax ? `Reste: ${formatPrice(trip.budgetMax - budget.total)}€` : `Dépassement: ${formatPrice(budget.total - trip.budgetMax)}€`}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected Items */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {selectedTransport && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TransportIcon type={selectedTransport.type} />
                    <span className="font-semibold">Transport sélectionné</span>
                  </div>
                  <Badge className={getStatusColor(selectedTransport.status)}>
                    {selectedTransport.status === 'BOOKED' ? 'Réservé' : 'Sélectionné'}
                  </Badge>
                </div>
                <p className="text-sm">{selectedTransport.provider} — {selectedTransport.origin} → {selectedTransport.destination}</p>
                <p className="text-sm text-muted-foreground">{formatDate(selectedTransport.departure)}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold text-lg">{formatPrice(selectedTransport.price)}€</span>
                  <div className="flex gap-2">
                    {selectedTransport.status !== 'BOOKED' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleConfirmBooking('transport', selectedTransport.id)}
                        disabled={confirming === `transport-${selectedTransport.id}`}
                      >
                        {confirming === `transport-${selectedTransport.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                        Confirmer
                      </Button>
                    )}
                    <a href={selectedTransport.bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedAccommodation && (
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">Hébergement sélectionné</span>
                  </div>
                  <Badge className={getStatusColor(selectedAccommodation.status)}>
                    {selectedAccommodation.status === 'BOOKED' ? 'Réservé' : 'Sélectionné'}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{selectedAccommodation.name}</p>
                <p className="text-sm text-muted-foreground">{selectedAccommodation.address}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm">{selectedAccommodation.rating} ({selectedAccommodation.reviewCount} avis)</span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold text-lg">{formatPrice(selectedAccommodation.totalPrice)}€</span>
                  <div className="flex gap-2">
                    {selectedAccommodation.status !== 'BOOKED' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleConfirmBooking('accommodation', selectedAccommodation.id)}
                        disabled={confirming === `accommodation-${selectedAccommodation.id}`}
                      >
                        {confirming === `accommodation-${selectedAccommodation.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                        Confirmer
                      </Button>
                    )}
                    <a href={selectedAccommodation.bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search Button */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Rechercher des options
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Trouvez le meilleur transport et hébergement pour {trip.destination}
                </p>
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching}
                size="lg"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Lancer la recherche
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {hasSearched && !isSearching && (
          <div className="space-y-6">
            {/* Transport Results */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Transport ({transportResults.length} trouvé{transportResults.length > 1 ? 's' : ''})
              </h2>
              {transportResults.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {transportResults.map((trans) => (
                    <Card key={trans.id} className={trans.selected ? 'border-2 border-blue-500' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TransportIcon type={trans.type} />
                            <span className="font-semibold">{trans.provider}</span>
                          </div>
                          {trans.selected && <Badge variant="default">Sélectionné</Badge>}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span>{trans.origin}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span>{trans.destination}</span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> Départ: {formatDate(trans.departure)}</p>
                          {trans.duration && <p>Durée: {trans.duration}</p>}
                          {trans.class && <p>Classe: {trans.class}</p>}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3">
                          <span className="font-bold text-xl">{formatPrice(trans.price)}€</span>
                          <div className="flex gap-2">
                            {!trans.selected ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleSelect('transport', trans.id, true)}
                                disabled={selecting === `transport-${trans.id}`}
                              >
                                {selecting === `transport-${trans.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
                                Choisir
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSelect('transport', trans.id, false)}
                              >
                                Retirer
                              </Button>
                            )}
                            <a href={trans.bookingUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center text-muted-foreground">
                  Aucun transport trouvé pour ces dates.
                </Card>
              )}
            </div>

            {/* Accommodation Results */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Bed className="h-5 w-5" />
                Hébergement ({accommodationResults.length} trouvé{accommodationResults.length > 1 ? 's' : ''})
              </h2>
              {accommodationResults.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accommodationResults.map((acc) => (
                    <Card key={acc.id} className={acc.selected ? 'border-2 border-green-500' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold truncate">{acc.name}</span>
                          {acc.selected && <Badge variant="default">Sélectionné</Badge>}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">{acc.address}</p>
                        
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium">{acc.rating}</span>
                          <span className="text-sm text-muted-foreground">({acc.reviewCount} avis)</span>
                        </div>
                        
                        {acc.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {acc.amenities.slice(0, 3).map((amenity, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{amenity}</Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          <div>
                            <span className="font-bold text-xl">{formatPrice(acc.totalPrice)}€</span>
                            <span className="text-sm text-muted-foreground"> ({formatPrice(acc.pricePerNight)}€/nuit)</span>
                          </div>
                          <div className="flex gap-2">
                            {!acc.selected ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleSelect('accommodation', acc.id, true)}
                                disabled={selecting === `accommodation-${acc.id}`}
                              >
                                {selecting === `accommodation-${acc.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
                                Choisir
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSelect('accommodation', acc.id, false)}
                              >
                                Retirer
                              </Button>
                            )}
                            <a href={acc.bookingUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center text-muted-foreground">
                  Aucun hébergement trouvé pour ces dates.
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
