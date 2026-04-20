import { chromium, Browser } from 'playwright'

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
  
  let browser: Browser | null = null
  
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    const page = await context.newPage()
    
    // SNCF Connect search URL format
    const depDate = new Date(departure)
    const formattedDate = depDate.toISOString().split('T')[0]
    
    const searchUrl = `https://www.sncf-connect.com/app/en-en/search/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&departureDate=${formattedDate}`
    
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })
    
    // Wait for train results to load
    await page.waitForTimeout(5000)
    
    // Extract train data
    const trains = await page.evaluate(() => {
      const results: any[] = []
      const cards = document.querySelectorAll('[data-testid="journey-card"]')
      
      cards.forEach((card, index) => {
        if (index >= 5) return
        
        const priceEl = card.querySelector('[data-testid="price"]')
        const departureEl = card.querySelector('[data-testid="departure-time"]')
        const arrivalEl = card.querySelector('[data-testid="arrival-time"]')
        const durationEl = card.querySelector('[data-testid="duration"]')
        
        const priceText = priceEl?.textContent?.trim() || ''
        const departureTime = departureEl?.textContent?.trim() || ''
        const arrivalTime = arrivalEl?.textContent?.trim() || ''
        const duration = durationEl?.textContent?.trim() || ''
        
        const priceMatch = priceText.match(/[\d\s]+/)
        const price = priceMatch ? parseInt(priceMatch[0].replace(/\s/g, '')) : 0
        
        if (price > 0) {
          results.push({ price, departureTime, arrivalTime, duration })
        }
      })
      
      return results
    })
    
    return trains.map((t: any, i: number) => ({
      id: `sncf-${i}`,
      type: 'TRAIN' as const,
      provider: 'SNCF',
      origin,
      destination,
      departure: new Date(departure),
      arrival: new Date(departure),
      price: t.price,
      currency: 'EUR',
      bookingUrl: `https://www.sncf-connect.com/`,
      duration: t.duration,
    }))
    
  } catch (error) {
    console.error('SNCF scraping error:', error)
    return []
  } finally {
    if (browser) await browser.close()
  }
}
