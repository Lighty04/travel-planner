import { NextRequest, NextResponse } from 'next/server'

// Cities with their countries
const CITIES = [
  { city: 'Paris', country: 'France' },
  { city: 'Lyon', country: 'France' },
  { city: 'Marseille', country: 'France' },
  { city: 'Nice', country: 'France' },
  { city: 'Bordeaux', country: 'France' },
  { city: 'Toulouse', country: 'France' },
  { city: 'Nantes', country: 'France' },
  { city: 'Strasbourg', country: 'France' },
  { city: 'Lille', country: 'France' },
  { city: 'Montpellier', country: 'France' },
  { city: 'London', country: 'United Kingdom' },
  { city: 'Berlin', country: 'Germany' },
  { city: 'Madrid', country: 'Spain' },
  { city: 'Barcelona', country: 'Spain' },
  { city: 'Rome', country: 'Italy' },
  { city: 'Milan', country: 'Italy' },
  { city: 'Venice', country: 'Italy' },
  { city: 'Amsterdam', country: 'Netherlands' },
  { city: 'Brussels', country: 'Belgium' },
  { city: 'Vienna', country: 'Austria' },
  { city: 'Prague', country: 'Czech Republic' },
  { city: 'Budapest', country: 'Hungary' },
  { city: 'Lisbon', country: 'Portugal' },
  { city: 'Porto', country: 'Portugal' },
  { city: 'Athens', country: 'Greece' },
  { city: 'Istanbul', country: 'Turkey' },
  { city: 'Dubrovnik', country: 'Croatia' },
  { city: 'Zurich', country: 'Switzerland' },
  { city: 'Geneva', country: 'Switzerland' },
  { city: 'Edinburgh', country: 'United Kingdom' },
]

// Countries for suggestions
const COUNTRIES = [
  'France', 'United Kingdom', 'Germany', 'Spain', 'Italy', 
  'Netherlands', 'Belgium', 'Switzerland', 'Portugal', 
  'Greece', 'Turkey', 'Croatia', 'Austria', 'Czech Republic', 'Hungary'
]

function getSuggestions(query: string, type: 'origin' | 'destination'): string[] {
  const searchTerm = query.toLowerCase().trim()
  
  if (searchTerm.length === 0) return []
  
  const results: string[] = []
  
  // Add matching cities as "City, Country"
  for (const { city, country } of CITIES) {
    if (city.toLowerCase().includes(searchTerm) || country.toLowerCase().includes(searchTerm)) {
      results.push(`${city}, ${country}`)
    }
  }
  
  // Add matching countries
  for (const country of COUNTRIES) {
    if (country.toLowerCase().includes(searchTerm) && !results.some(r => r.endsWith(country))) {
      results.push(country)
    }
  }
  
  // Limit results
  return results.slice(0, 8)
}

export async function POST(req: NextRequest) {
  try {
    const { query, type } = await req.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ suggestions: [] })
    }
    
    const suggestions = getSuggestions(query, type || 'destination')
    
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
