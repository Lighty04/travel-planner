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

    return response.data.access_token
  } catch (error: any) {
    console.log('[Amadeus Hotels] Auth failed:', error.message)
    return null
  }
}

// City IATA codes for Amadeus
const CITY_CODES: Record<string, string> = {
  paris: 'PAR', lyon: 'LYS', marseille: 'MRS', bordeaux: 'BOD',
  lille: 'LIL', nantes: 'NTE', toulouse: 'TLS', strasbourg: 'SXB',
  montpellier: 'MPL', nice: 'NCE', rennes: 'RNS',
  london: 'LON', berlin: 'BER', barcelona: 'BCN', rome: 'ROM',
  madrid: 'MAD', amsterdam: 'AMS', brussels: 'BRU', vienna: 'VIE',
  geneva: 'GVA', zurich: 'ZRH', milan: 'MIL', munich: 'MUC',
  frankfurt: 'FRA', prague: 'PRG', budapest: 'BUD', warsaw: 'WAW',
  dubai: 'DXB', istanbul: 'IST', lisbon: 'LIS', dublin: 'DUB',
  edinburgh: 'EDI', copenhagen: 'CPH', stockholm: 'ARN', oslo: 'OSL',
  helsinki: 'HEL', athens: 'ATH', warszawa: 'WAW',
}

async function searchAmadeusHotels(
  destination: string,
  checkIn: string,
  checkOut: string,
  guests: number,
): Promise<HotelResult[]> {
  const token = await getAmadeusToken()
  if (!token) return []

  const cityCode = CITY_CODES[destination.toLowerCase().replace(/[^a-z]/g, '')] || destination.slice(0, 3).toUpperCase()

  try {
    // Step 1: Find hotels by city
    const hotelsResponse = await axios.get(
      'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          cityCode,
          radius: 10,
          radiusUnit: 'KM',
          ratings: '2,3,4,5',
        },
        timeout: 15000,
      }
    )

    const hotels = hotelsResponse.data?.data
    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      return []
    }

    // Step 2: Get offers for these hotels
    const hotelIds = hotels.slice(0, 10).map((h: any) => h.hotelId).join(',')
    
    const nights = Math.max(1, Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    ))

    const offersResponse = await axios.get(
      'https://test.api.amadeus.com/v3/shopping/hotel-offers',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          hotelIds,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: guests,
          currency: 'EUR',
          bestRateOnly: true,
        },
        timeout: 15000,
      }
    )

    const offers = offersResponse.data?.data
    if (!offers || !Array.isArray(offers)) {
      return []
    }

    return offers.map((offer: any, i: number): HotelResult => {
      const hotel = offer.hotel
      const roomOffer = offer.offers?.[0]
      const price = roomOffer?.price?.total ? parseFloat(roomOffer.price.total) : 0

      return {
        id: `amadeus-${i}`,
        name: hotel?.name || 'Unknown Hotel',
        address: hotel?.address?.cityName || destination,
        pricePerNight: price > 0 ? Math.round(price / nights) : 0,
        totalPrice: Math.round(price),
        currency: roomOffer?.price?.currency || 'EUR',
        rating: hotel?.rating ? parseInt(hotel.rating) / 10 : 0,
        reviewCount: 0,
        amenities: hotel?.amenities || ['WiFi'],
        bookingUrl: roomOffer?.self || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`,
        imageUrl: hotel?.media?.[0]?.uri,
        chain: hotel?.chainCode,
      }
    }).filter((h: HotelResult) => h.pricePerNight > 0)
  } catch (error: any) {
    console.log('[Amadeus Hotels] Search failed:', error.message)
    return []
  }
}

// RapidAPI Booking.com
async function searchRapidAPIHotels(
  destination: string,
  checkIn: string,
  checkOut: string,
  guests: number,
): Promise<HotelResult[]> {
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) return []

  try {
    const response = await axios.get(
      'https://booking-com15.p.rapidapi.com/api/v1/hotels/search',
      {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'booking-com15.p.rapidapi.com',
        },
        params: {
          dest_id: destination,
          search_type: 'city',
          arrival_date: checkIn,
          departure_date: checkOut,
          adults: guests,
          room_number: 1,
          currency: 'EUR',
          languagecode: 'fr',
        },
        timeout: 15000,
      }
    )

    const results = response.data?.result
    if (!results || !Array.isArray(results)) return []

    const nights = Math.max(1, Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    ))

    return results.slice(0, 10).map((h: any, i: number): HotelResult => ({
      id: `rapid-${i}`,
      name: h.hotel_name || 'Unknown',
      address: h.address || destination,
      pricePerNight: Math.round(h.min_total_price / nights),
      totalPrice: Math.round(h.min_total_price),
      currency: 'EUR',
      rating: h.review_score / 10 || 0,
      reviewCount: h.review_nr || 0,
      amenities: h.facilities?.slice(0, 5) || ['WiFi'],
      bookingUrl: h.url || `https://booking.com/hotel/${h.hotel_id}.html`,
      imageUrl: h.max_photo_url || h.main_photo_url,
      chain: h.chain_name,
    }))
  } catch (error: any) {
    console.log('[RapidAPI Booking] Search failed:', error.message)
    return []
  }
}

// Realistic hotel chains data (fallback)
const HOTEL_CHAINS: Record<string, Array<{name: string, basePrice: number, rating: number, reviews: number, amenities: string[]}>> = {
  paris: [
    { name: 'Hôtel Le Marais Boutique', basePrice: 95, rating: 4.2, reviews: 1243, amenities: ['WiFi', 'Petit-déjeuner', 'Climatisation'] },
    { name: 'Mercure Paris Centre', basePrice: 135, rating: 4.1, reviews: 892, amenities: ['WiFi', 'Petit-déjeuner', 'Salle de sport'] },
    { name: 'Ibis Styles Paris Gare du Nord', basePrice: 85, rating: 3.9, reviews: 2104, amenities: ['WiFi', 'Petit-déjeuner'] },
    { name: 'Novotel Paris Tour Eiffel', basePrice: 165, rating: 4.3, reviews: 567, amenities: ['WiFi', 'Piscine', 'Salle de sport'] },
    { name: 'Premier Inn Paris Montmartre', basePrice: 75, rating: 3.8, reviews: 3401, amenities: ['WiFi'] },
    { name: 'Hôtel Des Grands Boulevards', basePrice: 195, rating: 4.5, reviews: 234, amenities: ['WiFi', 'Spa', 'Restaurant'] },
    { name: 'Holiday Inn Express Paris Canal', basePrice: 105, rating: 4.0, reviews: 1567, amenities: ['WiFi', 'Petit-déjeuner'] },
    { name: 'citizenM Paris Gare de Lyon', basePrice: 125, rating: 4.4, reviews: 987, amenities: ['WiFi', 'Tablette', 'Films gratuits'] },
    { name: 'B&B Hôtel Paris Porte de la Villette', basePrice: 65, rating: 3.6, reviews: 4521, amenities: ['WiFi'] },
    { name: 'Hyatt Regency Paris Étoile', basePrice: 245, rating: 4.6, reviews: 345, amenities: ['WiFi', 'Spa', 'Piscine', 'Salle de sport'] },
  ],
  lyon: [
    { name: 'Hôtel Lyon Centre', basePrice: 78, rating: 4.0, reviews: 892, amenities: ['WiFi', 'Petit-déjeuner'] },
    { name: 'Mercure Lyon Part-Dieu', basePrice: 110, rating: 4.1, reviews: 654, amenities: ['WiFi', 'Salle de sport'] },
    { name: 'Novotel Lyon Confluence', basePrice: 135, rating: 4.2, reviews: 432, amenities: ['WiFi', 'Piscine'] },
    { name: 'Ibis Lyon Gerland', basePrice: 72, rating: 3.8, reviews: 1234, amenities: ['WiFi'] },
    { name: 'B&B Hôtel Lyon Caluire', basePrice: 58, rating: 3.5, reviews: 876, amenities: ['WiFi'] },
  ],
  marseille: [
    { name: 'Hôtel Marseille Vieux-Port', basePrice: 88, rating: 4.1, reviews: 1234, amenities: ['WiFi', 'Petit-déjeuner', 'Vue mer'] },
    { name: 'Mercure Marseille Centre', basePrice: 115, rating: 4.0, reviews: 765, amenities: ['WiFi', 'Salle de sport'] },
    { name: 'Novotel Marseille Est', basePrice: 98, rating: 3.9, reviews: 543, amenities: ['WiFi', 'Piscine'] },
    { name: 'Ibis Marseille Centre', basePrice: 75, rating: 3.7, reviews: 1876, amenities: ['WiFi'] },
    { name: 'Hôtel La Residence du Vieux Port', basePrice: 145, rating: 4.3, reviews: 321, amenities: ['WiFi', 'Vue mer', 'Restaurant'] },
  ],
  berlin: [
    { name: 'Hôtel Berlin Mitte', basePrice: 82, rating: 4.0, reviews: 1567, amenities: ['WiFi', 'Petit-déjeuner'] },
    { name: 'Mercure Berlin Alexanderplatz', basePrice: 120, rating: 4.1, reviews: 987, amenities: ['WiFi', 'Salle de sport'] },
    { name: 'Novotel Berlin Tiergarten', basePrice: 110, rating: 4.0, reviews: 765, amenities: ['WiFi', 'Piscine'] },
    { name: 'Ibis Berlin Hauptbahnhof', basePrice: 70, rating: 3.8, reviews: 2345, amenities: ['WiFi'] },
    { name: 'Motel One Berlin-Potsdamer Platz', basePrice: 95, rating: 4.3, reviews: 1234, amenities: ['WiFi', 'Design'] },
  ],
  london: [
    { name: 'Premier Inn London City', basePrice: 125, rating: 4.1, reviews: 3456, amenities: ['WiFi', 'Petit-déjeuner'] },
    { name: 'Travelodge London Central', basePrice: 95, rating: 3.7, reviews: 5678, amenities: ['WiFi'] },
    { name: 'Hilton London Paddington', basePrice: 220, rating: 4.4, reviews: 1234, amenities: ['WiFi', 'Spa', 'Salle de sport'] },
    { name: 'Ibis London Earls Court', basePrice: 88, rating: 3.8, reviews: 2345, amenities: ['WiFi'] },
    { name: 'The Nadler Kensington', basePrice: 165, rating: 4.5, reviews: 876, amenities: ['WiFi', 'Kitchenette'] },
  ],
  barcelona: [
    { name: 'Hôtel Barcelona Plaza', basePrice: 92, rating: 4.0, reviews: 1234, amenities: ['WiFi', 'Petit-déjeuner', 'Piscine sur le toit'] },
    { name: 'Hotel Indigo Barcelona', basePrice: 140, rating: 4.3, reviews: 654, amenities: ['WiFi', 'Salle de sport', 'Design'] },
    { name: 'Ibis Barcelona Centro', basePrice: 78, rating: 3.8, reviews: 1876, amenities: ['WiFi'] },
    { name: 'Hotel Arts Barcelona', basePrice: 380, rating: 4.7, reviews: 432, amenities: ['WiFi', 'Spa', 'Piscine', 'Vue mer'] },
    { name: 'B&B Hôtel Barcelona Rubí', basePrice: 58, rating: 3.5, reviews: 987, amenities: ['WiFi'] },
  ],
  rome: [
    { name: 'Hotel Rome Centre', basePrice: 95, rating: 4.0, reviews: 1567, amenities: ['WiFi', 'Petit-déjeuner'] },
    { name: 'NH Collection Roma Centro', basePrice: 145, rating: 4.2, reviews: 876, amenities: ['WiFi', 'Salle de sport', 'Rooftop'] },
    { name: 'Ibis Roma Fiera', basePrice: 68, rating: 3.7, reviews: 2345, amenities: ['WiFi'] },
    { name: 'Hôtel Artis', basePrice: 78, rating: 3.9, reviews: 1234, amenities: ['WiFi', 'Petit-déjeuner'] },
    { name: 'Starhotels Michelangelo', basePrice: 155, rating: 4.3, reviews: 543, amenities: ['WiFi', 'Piscine'] },
  ],
}

function generateMockHotels(
  destination: string,
  checkIn: string,
  checkOut: string,
  guests: number,
): HotelResult[] {
  const nights = Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  ))

  const destKey = destination.toLowerCase().replace(/[^a-z]/g, '')
  const hotels = HOTEL_CHAINS[destKey] || HOTEL_CHAINS['paris']

  const checkInDate = new Date(checkIn)
  const isWeekend = checkInDate.getDay() === 5 || checkInDate.getDay() === 6
  const weekendMultiplier = isWeekend ? 1.15 : 1.0
  const durationDiscount = nights >= 7 ? 0.85 : nights >= 4 ? 0.9 : 1.0

  return hotels.map((hotel, index) => {
    const adjustedPrice = Math.round(hotel.basePrice * weekendMultiplier * durationDiscount)
    return {
      id: `mock-${index}`,
      name: hotel.name,
      address: `${destination}`,
      pricePerNight: adjustedPrice,
      totalPrice: Math.round(adjustedPrice * nights * guests),
      currency: 'EUR',
      rating: hotel.rating,
      reviewCount: hotel.reviews,
      amenities: hotel.amenities,
      bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${checkIn.replace(/-/g, '')}&checkout=${checkOut.replace(/-/g, '')}&group_adults=${guests}`,
      chain: undefined,
    }
  })
}

export async function searchHotels(params: {
  destination: string
  checkIn: string
  checkOut: string
  guests: number
}): Promise<HotelResult[]> {
  const { destination, checkIn, checkOut, guests } = params

  // Try Amadeus first
  const amadeusResults = await searchAmadeusHotels(destination, checkIn, checkOut, guests)
  if (amadeusResults.length > 0) {
    console.log(`[Amadeus] Found ${amadeusResults.length} real hotels`)
    return amadeusResults
  }

  // Try RapidAPI Booking.com
  const rapidResults = await searchRapidAPIHotels(destination, checkIn, checkOut, guests)
  if (rapidResults.length > 0) {
    console.log(`[RapidAPI] Found ${rapidResults.length} real hotels`)
    return rapidResults
  }

  // Fallback to realistic mocks
  console.log('[Fallback] Using realistic mock hotels')
  return generateMockHotels(destination, checkIn, checkOut, guests)
}
