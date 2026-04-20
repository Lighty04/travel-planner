import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  travelers: number
  status: string
}

async function getTrips(): Promise<Trip[]> {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/trips`, {
    headers: { 'Cookie': '' }, // Server-side fetch
  })
  if (!res.ok) return []
  return res.json()
}

export default async function TripsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // For now, empty trips - will fetch from API once running
  const trips: Trip[] = []

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Button asChild>
          <Link href="/trips/new">+ New Trip</Link>
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No trips yet. <Link href="/trips/new" className="underline">Create your first trip</Link>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <Card key={trip.id}>
              <CardHeader>
                <CardTitle>{trip.destination}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</p>
                <p>{trip.travelers} travelers · {trip.status}</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href={`/trips/${trip.id}`}>View Details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
