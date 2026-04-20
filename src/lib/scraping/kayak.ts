import { chromium, Browser } from 'playwright'

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
  
  let browser: Browser | null = null
  
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    const page = await context.newPage()
    
    // Format for Kayak URL
    const depFormatted = departure.replace(/-/g, '')
    
    const searchUrl = `https://www.kayak.com/flights/${origin}-${destination}/${depFormatted}?sort=price_a`
    
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    
    // Extract flight data
    const flights = await page.evaluate(() => {
      const results: any[] = []
      const cards = document.querySelectorAll('[class*="resultCard"]')
      
      cards.forEach((card, index) => {
        if (index >= 5) return
        
        const priceEl = card.querySelector('[class*="price"]')
        const airlineEl = card.querySelector('[class*="airline"]')
        const durationEl = card.querySelector('[class*="duration"]')
        
        const priceText = priceEl?.textContent?.trim() || ''
        const airline = airlineEl?.textContent?.trim() || 'Unknown'
        const duration = durationEl?.textContent?.trim() || ''
        
        const priceMatch = priceText.match(/[\d,]+/)
        const price = priceMatch ? parseInt(priceMatch[0].replace(',', '')) : 0
        
        if (price > 0) {
          results.push({ price, airline, duration })
        }
      })
      
      return results
    })
    
    return flights.map((f: any, i: number) => ({
      id: `kayak-${i}`,
      type: 'FLIGHT' as const,
      provider: f.airline,
      origin,
      destination,
      departure: new Date(departure),
      arrival: new Date(departure),
      price: f.price,
      currency: 'EUR',
      bookingUrl: `https://www.kayak.com/flights`,
      airline: f.airline,
      duration: f.duration,
      stops: 0,
    }))
    
  } catch (error) {
    console.error('Kayak scraping error:', error)
    return []
  } finally {
    if (browser) await browser.close()
  }
}
