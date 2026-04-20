import axios from 'axios'
import { parse } from 'node-html-parser'

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
}

export async function searchKayak(params: {
  origin: string
  destination: string
  departure: string
  return?: string
  passengers: number
}): Promise<FlightResult[]> {
  const { origin, destination, departure } = params

  try {
    // Format for Kayak URL
    const depFormatted = departure.replace(/-/g, '')
    const searchUrl = `https://www.kayak.com/flights/${origin}-${destination}/${depFormatted}?sort=price_a`

    // Make HTTP request
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    })

    const root = parse(response.data)
    const results: FlightResult[] = []

    // Try multiple selectors for flight cards
    const cards = root.querySelectorAll('.resultCard, [class*="result"], .Flights-Results-ResultItem')

    for (let index = 0; index < cards.length && results.length < 5; index++) {
      const card = cards[index]

      // Extract price
      const priceText = card.querySelector('[class*="price"], .price-text, .total-price')?.text?.trim() || ''
      const priceMatch = priceText.match(/[\d,]+/)
      const price = priceMatch ? parseInt(priceMatch[0].replace(',', '')) : 0

      // Extract airline
      const airline = card.querySelector('[class*="airline"], .airline-name, .carrier')?.text?.trim() || 'Unknown'

      // Extract duration
      const duration = card.querySelector('[class*="duration"], .duration, .flight-time')?.text?.trim()

      // Extract stops
      const stopsText = card.querySelector('[class*="stops"], .stops, .layover')?.text?.trim() || ''
      const stopsMatch = stopsText.match(/(\d+)/)
      const stops = stopsMatch ? parseInt(stopsMatch[1]) : 0

      if (price > 0) {
        results.push({
          id: `kayak-${index}`,
          type: 'FLIGHT',
          provider: airline,
          origin,
          destination,
          departure: new Date(departure),
          arrival: new Date(departure),
          price,
          currency: priceText.includes('€') ? 'EUR' : 'USD',
          bookingUrl: `https://www.kayak.com/flights/${origin}-${destination}/${depFormatted}`,
          airline,
          duration,
          stops,
        })
      }
    }

    return results

  } catch (error) {
    console.error('Kayak scraping error:', error)
    throw error
  }
}
