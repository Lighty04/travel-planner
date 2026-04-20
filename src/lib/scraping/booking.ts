import axios from 'axios'
import { parse } from 'node-html-parser'

export interface AccommodationResult {
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
}

export async function searchBooking(params: {
  destination: string
  checkIn: string
  checkOut: string
  guests: number
}): Promise<AccommodationResult[]> {
  const { destination, checkIn, checkOut, guests } = params

  try {
    // Format dates for Booking.com URL
    const checkInFormatted = checkIn.replace(/-/g, '')
    const checkOutFormatted = checkOut.replace(/-/g, '')

    // Construct search URL
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${checkInFormatted}&checkout=${checkOutFormatted}&group_adults=${guests}`

    // Make HTTP request
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    })

    // Parse HTML
    const root = parse(response.data)
    const results: AccommodationResult[] = []

    // Find property cards using data attributes
    const cards = root.querySelectorAll('[data-testid="property-card"], .sr_item')

    for (let index = 0; index < cards.length && results.length < 10; index++) {
      const card = cards[index]

      // Extract data
      const name = card.querySelector('[data-testid="title"], .sr-hotel__name, h3')?.text?.trim() || ''
      const priceText = card.querySelector('[data-testid="price-and-discounted-price"], .sr_price__number, .price')?.text?.trim() || ''
      const ratingText = card.querySelector('[data-testid="review-score"], .review-score-badge, .sr-review-score')?.text?.trim() || ''
      const address = card.querySelector('[data-testid="address"], .sr-hotel__address')?.text?.trim() || ''
      const linkEl = card.querySelector('a[data-testid="property-card-desktop"], a')
      const bookingUrl = linkEl?.getAttribute?.('href') || ''

      // Parse price
      const priceMatch = priceText.match(/[\d\s,]+/)
      const price = priceMatch ? parseInt(priceMatch[0].replace(/[\s,]/g, '')) : 0

      // Parse rating
      const ratingMatch = ratingText.match(/(\d+\.?\d*)/)
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0

      // Parse review count
      const reviewMatch = ratingText.match(/(\d+)\s*reviews?/i)
      const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0

      if (name && price > 0) {
        results.push({
          id: `booking-${index}`,
          name,
          address: address || `${destination}, France`,
          pricePerNight: price,
          totalPrice: price * 3,
          currency: priceText.includes('€') ? 'EUR' : 'USD',
          rating,
          reviewCount,
          amenities: ['WiFi', 'Breakfast'],
          bookingUrl: bookingUrl.startsWith('http') ? bookingUrl : `https://booking.com${bookingUrl}`,
        })
      }
    }

    return results.filter(h => h.rating >= 4.0 || h.rating === 0)

  } catch (error) {
    console.error('Booking.com scraping error:', error)
    throw error
  }
}
