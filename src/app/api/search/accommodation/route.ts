import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchBooking } from '@/lib/scraping/booking'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tripId, destination, checkIn, checkOut, guests } = body
    
    // Search Booking.com
    const results = await searchBooking({
      destination,
      checkIn,
      checkOut,
      guests,
    })
    
    // Save results to database
    const saved = await Promise.all(
      results.map(async (hotel) =>
        prisma.accommodation.create({
          data: {
            tripId,
            provider: 'booking.com',
            name: hotel.name,
            address: hotel.address,
            pricePerNight: hotel.pricePerNight,
            totalPrice: hotel.totalPrice,
            currency: hotel.currency,
            rating: hotel.rating,
            reviewCount: hotel.reviewCount,
            amenities: hotel.amenities,
            bookingUrl: hotel.bookingUrl,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
        })
      )
    )
    
    return NextResponse.json(saved)
  } catch (error) {
    console.error('Accommodation search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
