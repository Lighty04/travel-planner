import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const createTripSchema = z.object({
  destination: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  travelers: z.number().int().min(1).default(1),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const trips = await prisma.trip.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(trips)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createTripSchema.parse(body)

    const trip = await prisma.trip.create({
      data: {
        userId: session.user.id,
        destination: data.destination,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        travelers: data.travelers,
      },
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
}
