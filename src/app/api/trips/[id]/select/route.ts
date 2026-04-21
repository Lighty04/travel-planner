import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

// POST /api/trips/[id]/select - Select/deselect a transport or accommodation option
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { type, optionId, selected } = await req.json()

    if (!['transport', 'accommodation'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Deselect all other options of the same type first (single selection)
    if (selected) {
      if (type === 'transport') {
        await prisma.transportOption.updateMany({
          where: { tripId: id },
          data: { selected: false, status: 'PENDING' },
        })
        await prisma.transportOption.update({
          where: { id: optionId },
          data: { selected: true, status: 'SELECTED' },
        })
      } else {
        await prisma.accommodation.updateMany({
          where: { tripId: id },
          data: { selected: false, status: 'PENDING' },
        })
        await prisma.accommodation.update({
          where: { id: optionId },
          data: { selected: true, status: 'SELECTED' },
        })
      }
    } else {
      // Deselect this one
      if (type === 'transport') {
        await prisma.transportOption.update({
          where: { id: optionId },
          data: { selected: false, status: 'PENDING' },
        })
      } else {
        await prisma.accommodation.update({
          where: { id: optionId },
          data: { selected: false, status: 'PENDING' },
        })
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        tripId: id,
        actorId: session.user.id,
        action: selected ? `selected_${type}` : `deselected_${type}`,
        details: JSON.stringify({ optionId, type }),
      },
    })

    // Recalculate totals
    const [selectedTransport, selectedAccommodation] = await Promise.all([
      prisma.transportOption.findFirst({
        where: { tripId: id, selected: true },
      }),
      prisma.accommodation.findFirst({
        where: { tripId: id, selected: true },
      }),
    ])

    const totalCost = 
      (selectedTransport ? Number(selectedTransport.price) : 0) +
      (selectedAccommodation ? Number(selectedAccommodation.totalPrice) : 0)

    return NextResponse.json({
      success: true,
      selected,
      totalCost,
      transport: selectedTransport,
      accommodation: selectedAccommodation,
    })
  } catch (error) {
    console.error('[SELECT OPTION] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update selection' },
      { status: 500 }
    )
  }
}
