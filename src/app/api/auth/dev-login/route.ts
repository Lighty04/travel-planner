import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encode } from 'next-auth/jwt'

export async function POST() {
  try {
    // Create a proper JWT for dev mode that NextAuth will accept
    const token = await encode({
      token: {
        sub: 'dev-user-001',
        name: 'Dev User',
        email: 'dev@example.com',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 30 * 24 * 60 * 60, // 30 days
      },
      secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
    })

    const cookieStore = await cookies()
    cookieStore.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    console.log('[DEV LOGIN] Created JWT session for dev-user-001')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DEV LOGIN] Failed:', error)
    return NextResponse.json({ error: 'Dev login failed' }, { status: 500 })
  }
}
