import { chromium, Browser, Page } from 'playwright'

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
  
  let browser: Browser | null = null
  
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    const page = await context.newPage()
    
    // Format dates for Booking.com URL
    const checkInFormatted = checkIn.replace(/-/g, '')
    const checkOutFormatted = checkOut.replace(/-/g, '')
    
    // Construct search URL
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${checkInFormatted}&checkout=${checkOutFormatted}&group_adults=${guests}`
    
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })
    
    // Wait for results to load
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 })
    
    // Extract hotel data
    const hotels = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="property-card"]')
      const results: any[] = []
      
      cards.forEach((card, index) => {
        if (index >= 10) return // Limit to 10 results
        
        const nameEl = card.querySelector('[data-testid="title"]')
        const priceEl = card.querySelector('[data-testid="price-and-discounted-price"]')
        const ratingEl = card.querySelector('[data-testid="review-score"]')
        const addressEl = card.querySelector('[data-testid="address"]')
        const linkEl = card.querySelector('a[data-testid="property-card-desktop"]')
        
        const name = nameEl?.textContent?.trim() || 'Unknown'
        const priceText = priceEl?.textContent?.trim() || ''
        const ratingText = ratingEl?.textContent?.trim() || ''
        const address = addressEl?.textContent?.trim() || ''
        const bookingUrl = linkEl?.getAttribute('href') || ''
        
        // Parse price (remove currency symbols)
        const priceMatch = priceText.match(/[\d\s]+/)
        const price = priceMatch ? parseInt(priceMatch[0].replace(/\s/g, '')) : 0
        
        // Parse rating (e.g., "8.5" from "8.5 Very Good")
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/)
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0
        
        if (name && price > 0) {
          results.push({
            name,
            address,
            pricePerNight: price,
            totalPrice: price * 3, // Approximate
            currency: 'EUR',
            rating,
            reviewCount: 0,
            amenities: ['wifi'],
            bookingUrl: bookingUrl.startsWith('http') ? bookingUrl : `https://booking.com${bookingUrl}`,
          })
        }
      })
      
      return results
    })
    
    // Filter by rating >= 4.0
    const filtered = hotels.filter((h: any) => h.rating >= 4.0 || h.rating === 0)
    
    return filtered.map((h: any, i: number) => ({
      ...h,
      id: `booking-${i}`,
    }))
    
  } catch (error) {
    console.error('Booking.com scraping error:', error)
    return []
  } finally {
    if (browser) await browser.close()
  }
}
