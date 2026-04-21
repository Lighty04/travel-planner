import axios from 'axios'

export interface HotelResult {
  id: string
  name: string
  address: string
  pricePerNight: number
  totalPrice: number
  currency: string
  rating: number
  reviewCount: number
  amenities: string[]
  bookingUrl: string
  imageUrl?: string
  chain?: string
}

export type AccommodationResult = HotelResult

// Cache for destination IDs
const DEST_CACHE: Record<string, { id: string; type: string }> = {
  paris: { id: '-1456928', type: 'CITY' },
  london: { id: '-2601889', type: 'CITY' },
  'new york': { id: '20088325', type: 'CITY' },
  barcelona: { id: '-372490', type: 'CITY' },
  rome: { id: '-126693', type: 'CITY' },
  amsterdam: { id: '-2140479', type: 'CITY' },
  berlin: { id: '-1746443', type: 'CITY' },
  madrid: { id: '-390625', type: 'CITY' },
  lisbon: { id: '-2167973', type: 'CITY' },
  vienna: { id: '-1995499', type: 'CITY' },
  prague: { id: '-553173', type: 'CITY' },
  milan: { id: '-121726', type: 'CITY' },
  venice: { id: '-132007', type: 'CITY' },
  florence: { id: '-117543', type: 'CITY' },
  nice: { id: '-1454990', type: 'CITY' },
  marseille: { id: '-1449946', type: 'CITY' },
  lyon: { id: '-1441070', type: 'CITY' },
  bordeaux: { id: '-1412958', type: 'CITY' },
  toulouse: { id: '-1460730', type: 'CITY' },
  strasbourg: { id: '-1459330', type: 'CITY' },
  brussels: { id: '-1955537', type: 'CITY' },
  zurich: { id: '-2552855', type: 'CITY' },
  geneva: { id: '-2552673', type: 'CITY' },
  dubai: { id: '-782831', type: 'CITY' },
  tokyo: { id: '-246227', type: 'CITY' },
  bangkok: { id: '-3414440', type: 'CITY' },
  singapore: { id: '-2679652', type: 'CITY' },
  sydney: { id: '-1603135', type: 'CITY' },
  'los angeles': { id: '20014181', type: 'CITY' },
  'san francisco': { id: '20015732', type: 'CITY' },
  chicago: { id: '20033173', type: 'CITY' },
  miami: { id: '20023181', type: 'CITY' },
  'las vegas': { id: '20079110', type: 'CITY' },
}

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

async function searchDestination(query: string): Promise<{ id: string; type: string } | null> {
  if (!RAPIDAPI_KEY) return null

  try {
    const response = await axios.get(
      'https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination',
      {
        params: { query },
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'booking-com15.p.rapidapi.com',
        },
        timeout: 10000,
      }
    )

    const data = response.data
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const dest = data.data[0]
      return {
        id: dest.dest_id || dest.id,
        type: dest.search_type || 'CITY',
      }
    }
    return null
  } catch (error: any) {
    console.log('[RapidAPI Hotels] Search destination failed:', error.message)
    return null
  }
}

export async function searchHotelsRapidAPI({
  destination,
  checkIn,
  checkOut,
  guests = 2,
}: {
  destination: string
  checkIn: string
  checkOut: string
  guests?: number
}): Promise<HotelResult[]> {
  // Calculate nights
  const nights = Math.max(1, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  ))

  if (!RAPIDAPI_KEY) {
    console.log('[RapidAPI Hotels] No API key')
    return []
  }

  // Get destination ID
  const destKey = destination.toLowerCase().trim()
  let destInfo: { id: string; type: string } | null = DEST_CACHE[destKey] || null

  if (!destInfo) {
    destInfo = await searchDestination(destination)
    if (destInfo) {
      DEST_CACHE[destKey] = destInfo
    }
  }

  if (!destInfo) {
    console.log('[RapidAPI Hotels] No dest_id found')
    return []
  }

  try {
    const response = await axios.get(
      'https://booking-com15.p.rapidapi.com/api/v1/hotels/search',
      {
        params: {
          dest_id: destInfo.id,
          search_type: destInfo.type,
          arrival_date: checkIn,
          departure_date: checkOut,
          adults: guests,
          room_qty: Math.ceil(guests / 2),
          page_number: 1,
          languagecode: 'fr',
          currency_code: 'EUR',
        },
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'booking-com15.p.rapidapi.com',
        },
        timeout: 15000,
      }
    )

    const data = response.data
    if (!data?.data?.result || !Array.isArray(data.data.result)) {
      console.log('[RapidAPI Hotels] No results')
      return []
    }

    const hotels = data.data.result.map((h: any, i: number) => {
      const price = h.min_total_price || h.composite_price_breakdown?.gross_amount?.value || 0
      const perNight = nights > 0 ? price / nights : price

      return {
        id: `rapid-${h.hotel_id || i}`,
        name: h.hotel_name || `Hôtel ${destination} ${i + 1}`,
        address: `${h.city || destination}, ${h.country_trans || ''}`.trim(),
        pricePerNight: Math.round(perNight * 100) / 100,
        totalPrice: Math.round(price * 100) / 100,
        currency: 'EUR',
        rating: h.review_score ? h.review_score / 2 : 4.0,
        reviewCount: h.review_nr || 0,
        amenities: (h.facilities_block?.facilities || []).map((f: any) => f.name).slice(0, 5) || ['WiFi'],
        bookingUrl: (() => {
          if (h.url && h.url.includes('?')) return h.url
          return `${h.url || `https://www.booking.com/hotel/${h.hotel_id}.html`}?checkin=${checkIn}&checkout=${checkOut}&group_adults=${guests}&no_rooms=${Math.ceil(guests / 2)}`
        })(),
        imageUrl: h.max_photo_url || h.main_photo_url,
        chain: h.chain_name || undefined,
      }
    })

    if (hotels.length === 0) {
      return []
    }

    return hotels
  } catch (error: any) {
    console.log('[RapidAPI Hotels] Search failed:', error.message)
    return []
  }
}
