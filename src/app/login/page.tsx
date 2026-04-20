import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/trips')
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
      </div>
    </div>
  )
}
