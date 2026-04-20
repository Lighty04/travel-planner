'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function NewTripPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      destination: formData.get('destination'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      travelers: parseInt(formData.get('travelers') as string) || 1,
    }

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to create trip')
      
      const trip = await res.json()
      router.push(`/trips/${trip.id}`)
    } catch (err) {
      setError('Failed to create trip. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Trip</h1>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Destination</label>
          <input 
            name="destination" 
            placeholder="Paris, France" 
            required 
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input 
              name="startDate" 
              type="date" 
              required 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input 
              name="endDate" 
              type="date" 
              required 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Travelers</label>
          <input 
            name="travelers" 
            type="number" 
            min={1} 
            defaultValue={1} 
            required 
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create Trip'}
        </Button>
      </form>
    </div>
  )
}
