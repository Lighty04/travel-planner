import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/trips/[id]/budget - Get budget breakdown
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const trip = await prisma.trip.findFirst({
      where: { id, userId: session.user.id },
      include: {
        transportOptions: true,
        accommodations: true,
        activities: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const selectedTransport = trip.transportOptions.find(t => t.selected)
    const selectedAccommodation = trip.accommodations.find(a => a.selected)
    const activitiesCost = trip.activities.reduce((sum, a) => sum + (Number(a.ticketPrice) || 0), 0)

    const transportCost = selectedTransport ? Number(selectedTransport.price) : 0
    const accommodationCost = selectedAccommodation ? Number(selectedAccommodation.totalPrice) : 0
    const totalCost = transportCost + accommodationCost + activitiesCost

    const nights = Math.max(1, Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ))

    return NextResponse.json({
      trip: {
        id: trip.id,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.travelers,
        nights,
        budgetMin: trip.budgetMin,
        budgetMax: trip.budgetMax,
        status: trip.status,
      },
      breakdown: {
        transport: {
          selected: selectedTransport ? {
            provider: selectedTransport.provider,
            type: selectedTransport.type,
            origin: selectedTransport.origin,
            destination: selectedTransport.destination,
            departure: selectedTransport.departure,
            price: transportCost,
          } : null,
          cost: transportCost,
        },
        accommodation: {
          selected: selectedAccommodation ? {
            name: selectedAccommodation.name,
            provider: selectedAccommodation.provider,
            pricePerNight: Number(selectedAccommodation.pricePerNight),
            totalPrice: accommodationCost,
            nights,
          } : null,
          cost: accommodationCost,
        },
        activities: {
          count: trip.activities.length,
          cost: activitiesCost,
        },
        total: totalCost,
      },
      withinBudget: trip.budgetMax ? totalCost <= trip.budgetMax : null,
      remaining: trip.budgetMax ? Math.max(0, trip.budgetMax - totalCost) : null,
    })
  } catch (error) {
    console.error('[BUDGET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate budget' },
      { status: 500 }
    )
  }
}
