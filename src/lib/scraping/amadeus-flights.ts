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

function getAirportCode(city: string): string {
  const key = city.toLowerCase().replace(/[^a-z]/g, '')
  return AIRPORT_CODES[key] || key.slice(0, 3).toUpperCase()
}

export async function searchFlights(params: {
  origin: string
  destination: string
  departure: string
  return?: string
  passengers: number
}): Promise<FlightResult[]> {
  const { origin, destination, departure, passengers } = params

  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    console.log('[RapidAPI] No RAPIDAPI_KEY configured')
    return []
  }

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
    if (!results || results.length === 0) {
      return []
    }

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
  } catch (error: any) {
    console.log('[RapidAPI] Skyscanner failed:', error.message)
    return []
  }
}
