import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// GET /api/trips/[id]/itinerary - Get all itinerary days with activities
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Get all itinerary days with activities
    const days = await prisma.itineraryDay.findMany({
      where: { tripId: id },
      include: {
        activities: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { dayNumber: 'asc' },
    })

    return NextResponse.json({ days })
  } catch (error) {
    console.error('[ITINERARY GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch itinerary' },
      { status: 500 }
    )
  }
}

// POST /api/trips/[id]/itinerary - Create/update itinerary day with activities
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { dayNumber, date, notes, activities } = body

    // Validate required fields
    if (!dayNumber || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: dayNumber, date' },
        { status: 400 }
      )
    }

    // Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Find existing day or create new one
    let day = await prisma.itineraryDay.findFirst({
      where: { tripId: id, dayNumber: parseInt(dayNumber) },
      include: { activities: true },
    })

    if (day) {
      // Update existing day
      day = await prisma.itineraryDay.update({
        where: { id: day.id },
        data: {
          date: new Date(date),
          notes: notes || null,
        },
        include: { activities: true },
      })
    } else {
      // Create new day
      day = await prisma.itineraryDay.create({
        data: {
          tripId: id,
          dayNumber: parseInt(dayNumber),
          date: new Date(date),
          notes: notes || null,
        },
        include: { activities: true },
      })
    }

    // If activities provided, create them
    if (activities && Array.isArray(activities) && activities.length > 0) {
      for (const activity of activities) {
        await prisma.activity.create({
          data: {
            tripId: id,
            itineraryDayId: day.id,
            name: activity.name,
            description: activity.description || null,
            address: activity.address || null,
            category: activity.category || 'activity',
            duration: activity.duration || 60,
            ticketRequired: activity.ticketRequired || false,
            ticketUrl: activity.ticketUrl || null,
            ticketPrice: activity.ticketPrice || null,
          },
        })
      }
    }

    // Fetch updated day with activities
    const updatedDay = await prisma.itineraryDay.findUnique({
      where: { id: day.id },
      include: {
        activities: {
          orderBy: { name: 'asc' },
        },
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        tripId: id,
        actorId: session.user.id,
        action: 'updated_itinerary',
        details: JSON.stringify({ dayNumber, date, activityCount: activities?.length || 0 }),
      },
    })

    return NextResponse.json({ day: updatedDay })
  } catch (error) {
    console.error('[ITINERARY POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update itinerary' },
      { status: 500 }
    )
  }
}

// DELETE /api/trips/[id]/itinerary - Delete an itinerary day or activity
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { dayId, activityId } = body

    // Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    if (activityId) {
      // Delete specific activity
      await prisma.activity.deleteMany({
        where: { id: activityId, tripId: id },
      })
    } else if (dayId) {
      // Delete entire day (will cascade delete activities)
      await prisma.itineraryDay.deleteMany({
        where: { id: dayId, tripId: id },
      })
    } else {
      return NextResponse.json(
        { error: 'Missing dayId or activityId' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ITINERARY DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete itinerary item' },
      { status: 500 }
    )
  }
}
