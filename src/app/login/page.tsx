'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDevLogin() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        router.push('/trips')
      } else {
        alert('Dev login failed')
        setLoading(false)
      }
    } catch (error) {
      alert('Dev login failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-2xl font-bold text-center">Travel Planner</h1>
        <p className="text-muted-foreground text-center">
          Sign in to start planning your trips
        </p>
        
        <Button asChild className="w-full">
          <a href="/api/auth/signin?callbackUrl=/trips">Sign in with Google</a>
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleDevLogin}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Dev Login (Skip OAuth)'}
        </Button>
      </div>
    </div>
  )
}
