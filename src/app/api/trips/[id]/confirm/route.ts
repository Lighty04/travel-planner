import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// POST /api/trips/[id]/confirm - Mark trip as BOOKED
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { type, optionId, bookingReference } = body

    const trip = await prisma.trip.findFirst({
      where: { id, userId: session.user.id },
      include: {
        transportOptions: true,
        accommodations: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    if (type === 'transport') {
      await prisma.transportOption.update({
        where: { id: optionId },
        data: { 
          status: 'BOOKED',
          selected: true,
        },
      })
    } else if (type === 'accommodation') {
      await prisma.accommodation.update({
        where: { id: optionId },
        data: { 
          status: 'BOOKED',
          selected: true,
        },
      })
    }

    // Check if all required options are booked
    const hasTransport = trip.transportOptions.some(t => t.status === 'BOOKED')
    const hasAccommodation = trip.accommodations.some(a => a.status === 'BOOKED')
    
    if (hasTransport && hasAccommodation) {
      await prisma.trip.update({
        where: { id },
        data: { status: 'BOOKED' },
      })
    }

    // Log
    await prisma.activityLog.create({
      data: {
        tripId: id,
        actorId: session.user.id,
        action: `booked_${type}`,
        details: JSON.stringify({ optionId, bookingReference }),
      },
    })

    return NextResponse.json({ success: true, status: hasTransport && hasAccommodation ? 'BOOKED' : 'PLANNING' })
  } catch (error) {
    console.error('[CONFIRM BOOKING] Error:', error)
    return NextResponse.json({ error: 'Failed to confirm booking' }, { status: 500 })
  }
}
