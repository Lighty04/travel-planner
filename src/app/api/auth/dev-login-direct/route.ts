import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Ensure dev user exists
    await prisma.user.upsert({
      where: { email: 'dev@example.com' },
      create: {
        id: 'dev-user-001',
        email: 'dev@example.com',
        name: 'Dev User',
      },
      update: {},
    })

    // Create JWT
    const token = await encode({
      token: {
        sub: 'dev-user-001',
        name: 'Dev User',
        email: 'dev@example.com',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 30 * 24 * 60 * 60,
      },
      secret: process.env.NEXTAUTH_SECRET || 'travel-planner-secret-change-in-production',
    })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    console.log('[DEV LOGIN DIRECT] Session created for dev-user-001')
    return NextResponse.json({ success: true, userId: 'dev-user-001' })
  } catch (error) {
    console.error('[DEV LOGIN DIRECT] Error:', error)
    return NextResponse.json({ error: 'Dev login failed' }, { status: 500 })
  }
}