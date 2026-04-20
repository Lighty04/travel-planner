import NextAuth from "next-auth/next"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dev",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dev",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    session: async ({ session, token }) => {
      if (session.user) session.user.id = token.sub || "dev-user-001"
      return session
    },
  },
  pages: { signIn: "/login" },
})

export { handler as GET, handler as POST }
