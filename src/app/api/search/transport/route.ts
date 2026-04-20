import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchKayak } from '@/lib/scraping/kayak'
import { searchSNCF } from '@/lib/scraping/sncf'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tripId, origin, destination, departure, return: returnDate, passengers } = body
    
    // Search both Kayak (flights) and SNCF (trains)
    const [flightResults, trainResults] = await Promise.all([
      searchKayak({ origin, destination, departure, return: returnDate, passengers }),
      searchSNCF({ origin, destination, departure, return: returnDate, passengers }),
    ])
    
    // Save flight results
    const savedFlights = await Promise.all(
      flightResults.map(async (flight) =>
        prisma.transportOption.create({
          data: {
            tripId,
            type: 'FLIGHT',
            provider: flight.airline || 'Unknown',
            origin: flight.origin,
            destination: flight.destination,
            departure: flight.departure,
            arrival: flight.arrival,
            price: flight.price,
            currency: flight.currency,
            bookingUrl: flight.bookingUrl,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
        })
      )
    )
    
    // Save train results
    const savedTrains = await Promise.all(
      trainResults.map(async (train) =>
        prisma.transportOption.create({
          data: {
            tripId,
            type: 'TRAIN',
            provider: 'SNCF',
            origin: train.origin,
            destination: train.destination,
            departure: train.departure,
            arrival: train.arrival,
            price: train.price,
            currency: train.currency,
            bookingUrl: train.bookingUrl,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      )
    )
    
    return NextResponse.json({
      flights: savedFlights,
      trains: savedTrains,
    })
  } catch (error) {
    console.error('Transport search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
