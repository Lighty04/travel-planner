import axios from 'axios'

export interface FlightResult {
  id: string
  type: 'FLIGHT'
  provider: string
  origin: string
  destination: string
  departure: Date
  arrival: Date
  price: number
  currency: string
  bookingUrl: string
  airline?: string
  duration?: string
  stops?: number
  flightNumber?: string
  cabinClass?: string
}

const AIRPORT_CODES: Record<string, string> = {
  paris: 'PAR', lyon: 'LYS', marseille: 'MRS', bordeaux: 'BOD',
  lille: 'LIL', nantes: 'NTE', toulouse: 'TLS', strasbourg: 'SXB',
  montpellier: 'MPL', nice: 'NCE', rennes: 'RNS',
  london: 'LON', berlin: 'BER', barcelona: 'BCN', rome: 'ROM',
  madrid: 'MAD', amsterdam: 'AMS', brussels: 'BRU', vienna: 'VIE',
  geneva: 'GVA', zurich: 'ZRH', milan: 'MIL', munich: 'MUC',
  frankfurt: 'FRA', prague: 'PRG', budapest: 'BUD', warsaw: 'WAW',
}

const AMADEUS_CACHE: { token: string; expiresAt: number } | null = null

async function getAmadeusToken(): Promise<string | null> {
  const key = process.env.AMADEUS_API_KEY
  const secret = process.env.AMADEUS_API_SECRET
  if (!key || !secret) return null

  if (AMADEUS_CACHE && AMADEUS_CACHE.expiresAt > Date.now()) {
    return AMADEUS_CACHE.token
  }

  try {
    const response = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: key,
        client_secret: secret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    )

    const token = response.data.access_token
    const expiresIn = response.data.expires_in || 1800
    
    // Cache token with 5min buffer
    const cache = { token, expiresAt: Date.now() + (expiresIn - 300) * 1000 }
    
    return token
  } catch (error: any) {
    console.log('[Amadeus] Auth failed:', error.message)
    return null
  }
}

// Realistic flight durations and pricing (fallback)
const ROUTES: Record<string, { duration: string; basePrice: number; distance: number }> = {
  'paris-lyon': { duration: '1h 10m', basePrice: 85, distance: 400 },
  'paris-marseille': { duration: '1h 25m', basePrice: 95, distance: 660 },
  'paris-bordeaux': { duration: '1h 10m', basePrice: 80, distance: 500 },
  'paris-london': { duration: '1h 15m', basePrice: 110, distance: 340 },
  'paris-berlin': { duration: '1h 50m', basePrice: 130, distance: 870 },
  'paris-barcelona': { duration: '1h 45m', basePrice: 120, distance: 830 },
  'paris-rome': { duration: '2h 05m', basePrice: 140, distance: 1100 },
  'paris-madrid': { duration: '2h 10m', basePrice: 135, distance: 1050 },
  'paris-amsterdam': { duration: '1h 20m', basePrice: 105, distance: 430 },
  'lyon-london': { duration: '1h 40m', basePrice: 115, distance: 740 },
  'lyon-berlin': { duration: '1h 55m', basePrice: 145, distance: 960 },
  'lyon-barcelona': { duration: '1h 30m', basePrice: 110, distance: 550 },
  'marseille-paris': { duration: '1h 25m', basePrice: 95, distance: 660 },
  'marseille-london': { duration: '2h 00m', basePrice: 150, distance: 1000 },
  'bordeaux-paris': { duration: '1h 10m', basePrice: 80, distance: 500 },
  'london-paris': { duration: '1h 15m', basePrice: 110, distance: 340 },
  'london-lyon': { duration: '1h 40m', basePrice: 115, distance: 740 },
  'berlin-paris': { duration: '1h 50m', basePrice: 130, distance: 870 },
  'barcelona-paris': { duration: '1h 45m', basePrice: 120, distance: 830 },
}

const AIRLINES = [
  { name: 'Air France', code: 'AF', basePrice: 120 },
  { name: 'EasyJet', code: 'U2', basePrice: 65 },
  { name: 'Ryanair', code: 'FR', basePrice: 45 },
  { name: 'Transavia', code: 'TO', basePrice: 80 },
  { name: 'Vueling', code: 'VY', basePrice: 75 },
  { name: 'Lufthansa', code: 'LH', basePrice: 140 },
  { name: 'British Airways', code: 'BA', basePrice: 150 },
  { name: 'KLM', code: 'KL', basePrice: 130 },
]

function getRouteKey(origin: string, destination: string): string {
  const o = origin.toLowerCase().replace(/[^a-z]/g, '')
  const d = destination.toLowerCase().replace(/[^a-z]/g, '')
  return `${o}-${d}`
}

function getAirportCode(city: string): string {
  const key = city.toLowerCase().replace(/[^a-z]/g, '')
  return AIRPORT_CODES[key] || key.slice(0, 3).toUpperCase()
}

async function searchAmadeusFlights(
  origin: string,
  destination: string,
  departure: string,
  passengers: number
): Promise<FlightResult[]> {
  const token = await getAmadeusToken()
  if (!token) return []

  const originCode = getAirportCode(origin)
  const destCode = getAirportCode(destination)

  try {
    const response = await axios.get(
      'https://test.api.amadeus.com/v2/shopping/flight-offers',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          originLocationCode: originCode,
          destinationLocationCode: destCode,
          departureDate: departure,
          adults: passengers,
          currencyCode: 'EUR',
          max: 10,
        },
        timeout: 15000,
      }
    )

    const offers = response.data?.data
    if (!offers || !Array.isArray(offers) || offers.length === 0) {
      return []
    }

    return offers.map((offer: any, i: number): FlightResult => {
      const itinerary = offer.itineraries?.[0]
      const segments = itinerary?.segments || []
      const firstSegment = segments[0] || {}
      const lastSegment = segments[segments.length - 1] || {}
      
      const airlineCode = offer.validatingAirlineCodes?.[0] || firstSegment.carrierCode || 'Unknown'
      const airlineName = getAirlineName(airlineCode)
      
      const departureTime = new Date(firstSegment.departure?.at || Date.now())
      const arrivalTime = new Date(lastSegment.arrival?.at || Date.now())
      
      // Calculate duration from ISO duration string
      let duration = '2h 00m'
      if (itinerary?.duration) {
        const dur = itinerary.duration.replace('PT', '')
        const hours = dur.match(/(\d+)H/)?.[1] || '0'
        const mins = dur.match(/(\d+)M/)?.[1] || '0'
        duration = `${hours}h ${mins.padStart(2, '0')}m`
      }

      const price = parseFloat(offer.price?.total || '0')
      const stops = segments.length - 1

      return {
        id: `amadeus-${i}`,
        type: 'FLIGHT',
        provider: airlineName,
        origin,
        destination,
        departure: departureTime,
        arrival: arrivalTime,
        price,
        currency: offer.price?.currency || 'EUR',
        bookingUrl: `https://www.kayak.com/flights/${originCode}-${destCode}/${departure.replace(/-/g, '')}?sort=price_a`,
        airline: airlineName,
        duration,
        stops,
        flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
        cabinClass: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy',
      }
    }).filter((f: FlightResult) => f.price > 0)
  } catch (error: any) {
    console.log('[Amadeus] Flight search failed:', error.message)
    return []
  }
}

function getAirlineName(code: string): string {
  const airlines: Record<string, string> = {
    'AF': 'Air France', 'KL': 'KLM', 'BA': 'British Airways',
    'LH': 'Lufthansa', 'FR': 'Ryanair', 'U2': 'EasyJet',
    'VY': 'Vueling', 'TO': 'Transavia', 'IB': 'Iberia',
    'AZ': 'Alitalia', 'SN': 'Brussels Airlines', 'LX': 'Swiss',
    'OS': 'Austrian Airlines', 'TP': 'TAP Portugal',
    'EI': 'Aer Lingus', 'DY': 'Norwegian', 'SK': 'SAS',
    'AY': 'Finnair', 'LO': 'LOT Polish Airlines',
    'OK': 'Czech Airlines', 'RO': 'TAROM',
    'AF|KL': 'Air France-KLM',
  }
  return airlines[code] || code
}

function generateMockFlights(
  origin: string,
  destination: string,
  departure: string,
  passengers: number
): FlightResult[] {
  const depDate = new Date(departure)
  const routeKey = getRouteKey(origin, destination)
  const route = ROUTES[routeKey] || { duration: '2h 00m', basePrice: 100, distance: 800 }

  const originCode = getAirportCode(origin)
  const destCode = getAirportCode(destination)

  // Time-based pricing: early morning cheaper, evening more expensive
  const flights = [
    { time: '06:30', arrival: '08:30', priceMod: 0.7, airline: AIRLINES[2] }, // Ryanair early
    { time: '08:15', arrival: '10:15', priceMod: 0.85, airline: AIRLINES[1] }, // EasyJet
    { time: '10:30', arrival: '12:30', priceMod: 1.0, airline: AIRLINES[0] }, // Air France
    { time: '13:45', arrival: '15:45', priceMod: 1.1, airline: AIRLINES[3] }, // Transavia
    { time: '16:00', arrival: '18:00', priceMod: 1.15, airline: AIRLINES[4] }, // Vueling
    { time: '18:30', arrival: '20:30', priceMod: 1.2, airline: AIRLINES[5] }, // Lufthansa
    { time: '20:45', arrival: '22:45', priceMod: 1.1, airline: AIRLINES[0] }, // Air France evening
  ]

  return flights.map((flight, i) => {
    const [depHour, depMin] = flight.time.split(':').map(Number)
    const [arrHour, arrMin] = flight.arrival.split(':').map(Number)
    
    const depTime = new Date(depDate)
    depTime.setHours(depHour, depMin)
    
    const arrTime = new Date(depDate)
    arrTime.setHours(arrHour, arrMin)
    if (arrTime < depTime) arrTime.setDate(arrTime.getDate() + 1)

    const basePrice = flight.airline.basePrice * (route.basePrice / 100)
    const price = Math.round(basePrice * flight.priceMod)

    return {
      id: `mock-${i}`,
      type: 'FLIGHT',
      provider: flight.airline.name,
      origin,
      destination,
      departure: depTime,
      arrival: arrTime,
      price,
      currency: 'EUR',
      bookingUrl: `https://www.kayak.com/flights/${originCode}-${destCode}/${departure.replace(/-/g, '')}?sort=price_a`,
      airline: flight.airline.name,
      duration: route.duration,
      stops: 0,
      flightNumber: `${flight.airline.code}${100 + i}`,
      cabinClass: 'Economy',
    }
  })
}

export async function searchFlights(params: {
  origin: string
  destination: string
  departure: string
  return?: string
  passengers: number
}): Promise<FlightResult[]> {
  const { origin, destination, departure, passengers } = params

  // Try Amadeus API first
  const amadeusResults = await searchAmadeusFlights(origin, destination, departure, passengers)
  if (amadeusResults.length > 0) {
    console.log(`[Amadeus] Found ${amadeusResults.length} real flights`)
    return amadeusResults
  }

  // Try RapidAPI Skyscanner (if key available)
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (rapidApiKey) {
    try {
      const originCode = getAirportCode(origin)
      const destCode = getAirportCode(destination)
      
      const response = await axios.get(
        'https://skyscanner80.p.rapidapi.com/api/v1/flights/search-roundtrip',
        {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'skyscanner80.p.rapidapi.com',
          },
          params: {
            fromId: originCode,
            toId: destCode,
            departDate: departure,
            adults: passengers,
            currency: 'EUR',
          },
          timeout: 15000,
        }
      )

      const results = response.data?.data?.itineraries
      if (results && results.length > 0) {
        return results.slice(0, 7).map((it: any, i: number): FlightResult => {
          const leg = it.legs?.[0]
          return {
            id: `skyscanner-${i}`,
            type: 'FLIGHT',
            provider: it.owner?.name || 'Unknown',
            origin,
            destination,
            departure: new Date(leg?.departure || Date.now()),
            arrival: new Date(leg?.arrival || Date.now()),
            price: Math.round(it.pricing?.total || 0),
            currency: 'EUR',
            bookingUrl: it.deeplink || `https://www.kayak.com/flights/${originCode}-${destCode}`,
            airline: leg?.carriers?.marketing?.[0]?.name,
            duration: leg?.durationInMinutes ? `${Math.floor(leg.durationInMinutes / 60)}h ${leg.durationInMinutes % 60}m` : undefined,
            stops: leg?.stopCount || 0,
          }
        }).filter((f: FlightResult) => f.price > 0)
      }
    } catch (error: any) {
      console.log('[RapidAPI] Skyscanner failed:', error.message)
    }
  }

  // Fallback to realistic mocks
  console.log('[Fallback] Using realistic mock flights')
  return generateMockFlights(origin, destination, departure, passengers)
}
