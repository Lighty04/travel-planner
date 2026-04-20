import axios from 'axios'
import { parse } from 'node-html-parser'

export interface TrainResult {
  id: string
  type: 'TRAIN'
  provider: string
  origin: string
  destination: string
  departure: Date
  arrival: Date
  price: number
  currency: string
  bookingUrl: string
  duration?: string
}

export async function searchSNCF(params: {
  origin: string
  destination: string
  departure: string
  return?: string
  passengers: number
}): Promise<TrainResult[]> {
  const { origin, destination, departure } = params

  try {
    const formattedDate = departure.replace(/-/g, '')
    const searchUrl = `https://www.sncf-connect.com/app/en-en/search/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&departureDate=${formattedDate}`

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    })

    const root = parse(response.data)
    const results: TrainResult[] = []

    // Try multiple selectors for journey cards
    const cards = root.querySelectorAll('[data-testid="journey-card"], .journey-card, .proposal-list-item')

    for (let index = 0; index < cards.length && results.length < 5; index++) {
      const card = cards[index]

      // Extract price
      const priceText = card.querySelector('[data-testid="price"], .price, .amount')?.text?.trim() || ''
      const priceMatch = priceText.match(/[\d\s,]+/)
      const price = priceMatch ? parseInt(priceMatch[0].replace(/[\s,]/g, '')) : 0

      // Extract times
      const departureTime = card.querySelector('[data-testid="departure-time"], .departure, .time-departure')?.text?.trim() || ''
      const arrivalTime = card.querySelector('[data-testid="arrival-time"], .arrival, .time-arrival')?.text?.trim() || ''
      const duration = card.querySelector('[data-testid="duration"], .duration, .journey-duration')?.text?.trim()

      if (price > 0) {
        // Parse departure time
        const now = new Date(departure)
        const [hours, minutes] = departureTime.split(':').map(Number)
        const depDate = new Date(now)
        if (!isNaN(hours) && !isNaN(minutes)) {
          depDate.setHours(hours, minutes)
        }

        // Parse arrival time (assume same day or next)
        const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number)
        const arrDate = new Date(now)
        if (!isNaN(arrHours) && !isNaN(arrMinutes)) {
          arrDate.setHours(arrHours, arrMinutes)
          if (arrDate < depDate) {
            arrDate.setDate(arrDate.getDate() + 1)
          }
        }

        results.push({
          id: `sncf-${index}`,
          type: 'TRAIN' as const,
          provider: 'SNCF',
          origin,
          destination,
          departure: depDate,
          arrival: arrDate,
          price,
          currency: 'EUR',
          bookingUrl: `https://www.sncf-connect.com/app/en-en/booking/itinerary?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&departureDate=${departure}`,
          duration,
        })
      }
    }

    return results

  } catch (error) {
    console.error('SNCF scraping error:', error)
    throw error
  }
}
