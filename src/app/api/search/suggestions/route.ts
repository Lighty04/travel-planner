import { NextRequest, NextResponse } from 'next/server'

// Common cities/airports for suggestions
const POPULAR_ORIGINS = [
  'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes', 'Strasbourg', 'Lille',
  'London', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Brussels', 'Geneva', 'Zurich'
]

const POPULAR_DESTINATIONS = [
  'Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux', 'Toulouse', 'Nantes', 'Strasbourg', 'Lille', 'Montpellier',
  'London', 'Berlin', 'Madrid', 'Barcelona', 'Rome', 'Milan', 'Venice', 'Amsterdam', 'Brussels', 'Vienna',
  'Prague', 'Budapest', 'Lisbon', 'Porto', 'Athens', 'Istanbul', 'Dubrovnik', 'Zurich', 'Geneva', 'Edinburgh'
]

export async function POST(req: NextRequest) {
  try {
    const { query, type } = await req.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ suggestions: [] })
    }
    
    const searchTerm = query.toLowerCase().trim()
    
    if (searchTerm.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }
    
    // Select source based on type
    const source = type === 'origin' ? POPULAR_ORIGINS : POPULAR_DESTINATIONS
    
    // Filter matching cities
    const suggestions = source
      .filter(city => city.toLowerCase().includes(searchTerm))
      .slice(0, 5) // Limit to 5 suggestions
    
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
