import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    // Set a simple session cookie for dev mode
    const cookieStore = await cookies()
    cookieStore.set('next-auth.session-token', 'dev-session-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Dev login failed' }, { status: 500 })
  }
}
