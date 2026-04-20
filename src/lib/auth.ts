import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dev',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dev',
    }),
    CredentialsProvider({
      id: 'dev',
      name: 'Dev Login',
      credentials: {},
      async authorize() {
        console.log('[AUTH] Dev authorize called')
        // Ensure dev user exists in database
        await prisma.user.upsert({
          where: { email: 'dev@example.com' },
          create: {
            id: 'dev-user-001',
            email: 'dev@example.com',
            name: 'Dev User',
          },
          update: {},
        })
        console.log('[AUTH] Dev user upserted')
        return {
          id: 'dev-user-001',
          name: 'Dev User',
          email: 'dev@example.com',
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id
        console.log('[AUTH] JWT callback - user:', user.id)
      }
      return token
    },
    session: async ({ session, token }) => {
      console.log('[AUTH] Session callback:', { tokenSub: token.sub })
      if (session.user) session.user.id = token.sub || 'dev-user-001'
      return session
    },
  },
  pages: { signIn: '/login' },
  debug: true,
}
