'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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

export default function TripDetailPage() {
  const params = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/trips/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setTrip(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="p-6">Loading...</div>
  if (!trip) return <div className="p-6">Trip not found</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/trips" className="text-sm text-muted-foreground hover:underline">← Back to trips</Link>
          <h1 className="text-2xl font-bold">{trip.destination}</h1>
        </div>
        <Button variant="outline">Edit Trip</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">Dates:</span> {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</p>
          <p><span className="font-medium">Travelers:</span> {trip.travelers}</p>
          <p><span className="font-medium">Status:</span> {trip.status}</p>
        </CardContent>
      </Card>
    </div>
  )
}
