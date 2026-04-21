import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const trip = await prisma.trip.findFirst({
    where: { id, userId: session.user.id },
    include: {
      transportOptions: { orderBy: { price: 'asc' } },
      accommodations: { orderBy: { pricePerNight: 'asc' } },
      activities: { orderBy: { name: 'asc' } },
      itineraryDays: { orderBy: { dayNumber: 'asc' }, include: { activities: true } },
      activityLog: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!trip) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Calculate totals
  const selectedTransport = trip.transportOptions.find(t => t.selected)
  const selectedAccommodation = trip.accommodations.find(a => a.selected)
  const nights = Math.max(1, Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
  ))

  return NextResponse.json({
    ...trip,
    nights,
    totalCost: 
      (selectedTransport ? Number(selectedTransport.price) : 0) +
      (selectedAccommodation ? Number(selectedAccommodation.totalPrice) : 0) +
      trip.activities.reduce((sum, a) => sum + (Number(a.ticketPrice) || 0), 0),
    selectedTransport,
    selectedAccommodation,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  // Only allow certain fields to be updated
  const allowedFields = ['destination', 'startDate', 'endDate', 'travelers', 'budgetMin', 'budgetMax', 'status']
  const updateData: Record<string, any> = {}
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = field.includes('Date') ? new Date(body[field]) : body[field]
    }
  }

  const trip = await prisma.trip.update({
    where: { id, userId: session.user.id },
    data: updateData,
  })

  // Log activity
  await prisma.activityLog.create({
    data: {
      tripId: id,
      actorId: session.user.id,
      action: 'updated_trip',
      details: JSON.stringify(updateData),
    },
  })

  return NextResponse.json(trip)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  await prisma.trip.delete({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
