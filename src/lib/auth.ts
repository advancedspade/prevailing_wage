import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { query, queryOne } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user && token.sub) {
        try {
          let profile = await queryOne<{ id: string }>(
            'SELECT id FROM public.profiles WHERE auth_provider = $1 AND auth_id = $2',
            ['google', token.sub]
          )
          if (!profile) {
            const email = (token.email ?? user.email) as string
            const name = (token.name ?? user.name) as string | null
            const { rows } = await query<{ id: string }>(
              `INSERT INTO public.profiles (auth_provider, auth_id, email, full_name, role)
               VALUES ($1, $2, $3, $4, 'user')
               RETURNING id`,
              ['google', token.sub, email || '', name]
            )
            profile = rows[0] ?? null
          }
          if (profile) token.profileId = profile.id
        } catch (e) {
          console.error(
            '[Auth] JWT callback failed (profile lookup/insert). Check DATABASE_URL and that Postgres is running.',
            e
          )
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.profileId as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
}
